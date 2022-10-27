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

const generateData = (date, sloId, ratio) => {
  const total = Math.round(Math.random() * 1000);
  const noise = 0.5 + Math.random() + Math.cos(Math.random() * 2 * Math.PI); // [-0.5; 2.5]

  let good = total;
  if (noise <= 0) {
    good = Math.max(Math.round((ratio + noise) * total), 0);
  }

  return {
    "@timestamp": formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:00.000'Z'"),
    slo: {
      id: sloId,
      revision: 1,
      numerator: good,
      denominator: total,
      _internal: {
        name: "My SLO",
        objective: {
          target: 0.95,
        },
      },
    },
  };
};

const generateHistoricalRollupData = async (sloId, fromDate, toDate, ratio) => {
  const esClient = getEsClient();
  let docs = [];
  let currentDate = fromDate;

  while (isBefore(currentDate, toDate) || isEqual(currentDate, toDate)) {
    docs.push({
      index: "slo-observability.sli-v1",
      ...generateData(currentDate, sloId, ratio),
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

const generateNewRollupData = async (sloId, toDate, ratio) => {
  const esClient = getEsClient();
  let lastDate = toDate;

  while (true) {
    const now = startOfMinute(new Date());
    if (isAfter(now, lastDate)) {
      lastDate = now;
      const res = await esClient.index({
        index: "slo-observability.sli-v1",
        pipeline: "slo-observability.sli.monthly",
        document: generateData(now, sloId, ratio),
      });
      assert(res.result === "created");

      console.log(
        `inserted 1 document [%s] for slo [%s]`,
        now.toISOString(),
        sloId
      );
    }
    await waitFor(1000);
  }
};

// node index.js slo_id ratio
(async function () {
  if (argv.length < 3) {
    throw new Error("Usage: node index.js slo_id ratio");
  }

  const sloId = argv[2];
  const now = startOfMinute(new Date());

  const fromDate = sub(now, { months: 3 });
  const toDate = now;

  // randomly generate good events as the ratio of total events
  // noise will be added
  const ratio = Math.min(Math.max(argv[3], 0), 1);

  await generateHistoricalRollupData(sloId, fromDate, toDate, ratio);
  await generateNewRollupData(sloId, toDate, ratio);
})();
