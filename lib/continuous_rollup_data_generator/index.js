const { Client } = require("@elastic/elasticsearch");
const assert = require("assert");
const {
  add,
  sub,
  isBefore,
  isAfter,
  startOfMinute,
  isEqual,
} = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");
const { argv } = require("process");

let index = 0;

const waitFor = async (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

const getEsClient = () => {
  const ES_USER = process.env.ELASTICSEARCH_USERNAME || "elastic";
  const ES_PASS = process.env.ELASTICSEARCH_PASSWORD || "changeme";
  const node = process.env.ELASTICSEARCH_HOSTS || "http://localhost:9200";

  const esClient = new Client({
    node,
    auth: {
      username: ES_USER,
      password: ES_PASS,
    },
    ssl: {
      rejectUnauthorized: false,
    },
  });

  return esClient;
};

const generateData = (date, sloId, sloRevision, timesliceTarget) => {
  index++;
  const total = Math.round(Math.random() * 1000);
  const noise =
    0.9 + Math.random() + Math.cos(index / 100) + Math.sin(Math.sqrt(index)); // https://www.desmos.com/calculator/kpilzqplg7
  const good = Math.round(Math.max(Math.min(total * (1 + noise), total), 0));

  return {
    "@timestamp": formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:00.000'Z'"),
    slo: {
      id: sloId,
      revision: sloRevision,
      numerator: good,
      denominator: total,
      isGoodSlice: good / total >= timesliceTarget ? 1 : 0,
    },
  };
};

const generateHistoricalRollupData = async (sloId, sloRevision, timesliceTarget, fromDate, toDate) => {
  const esClient = getEsClient();
  let docs = [];
  let currentDate = fromDate;

  while (isBefore(currentDate, toDate) || isEqual(currentDate, toDate)) {
    docs.push({
      index: "slo-observability.sli-v1",
      ...generateData(currentDate, sloId, sloRevision, timesliceTarget),
    });
    currentDate = add(currentDate, { minutes: 1 });
  }

  const result = await esClient.helpers.bulk({
    datasource: docs,
    onDocument(doc) {
      return {
        index: {
          _index: "slo-observability.sli-v1",
          pipeline: "slo-observability.sli.monthly",
        },
      };
    },
  });

  console.log(
    "inserted %d/%d historical documents for slo [%s] in %dms from %s to %s",
    result.total,
    result.successful,
    sloId,
    result.time,
    fromDate.toISOString(),
    toDate.toISOString()
  );
};

const generateNewRollupData = async (sloId, sloRevision, timesliceTarget, toDate) => {
  const esClient = getEsClient();
  let lastDate = toDate;

  while (true) {
    const now = startOfMinute(new Date());
    if (isAfter(now, lastDate)) {
      lastDate = now;
      const data = generateData(now, sloId, sloRevision, timesliceTarget);
      const res = await esClient.index({
        index: "slo-observability.sli-v1",
        pipeline: "slo-observability.sli.monthly",
        document: data,
      });
      assert(res.result === "created");

      console.log(
        `[%s] inserted 1 document for slo [%s] with ratio [%d]`,
        now.toISOString(),
        sloId,
        data.slo.numerator / data.slo.denominator
      );
    }
    await waitFor(1000);
  }
};

// node index.js slo_id
(async function () {
  if (argv.length < 3) {
    throw new Error("Usage: node index.js sloId [sloRevision] [timesliceTarget]");
  }

  const sloId = argv[2];
  const sloRevision = argv[3] || 1;
  const timesliceTarget = argv[4] || 0.99;
  const now = startOfMinute(new Date());

  const fromDate = sub(now, { months: 2 });
  const toDate = now;

  await generateHistoricalRollupData(sloId, sloRevision, timesliceTarget, fromDate, toDate);
  await generateNewRollupData(sloId, sloRevision, timesliceTarget, toDate);
})();
