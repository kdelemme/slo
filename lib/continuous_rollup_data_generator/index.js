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

const generateData = (date, sloId, [goodRatioMin, goodRatioMax]) => {
  const total = Math.round(Math.random() * 1000);
  const good = Math.min(
    Math.round(
      total * (Math.random() * (goodRatioMax - goodRatioMin) + goodRatioMin)
    ),
    total
  );

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

const generateHistoricalRollupData = async (
  sloId,
  fromDate,
  toDate,
  goodRatio
) => {
  const esClient = getEsClient();
  let docs = [];
  let currentDate = fromDate;

  while (isBefore(currentDate, toDate) || isEqual(currentDate, toDate)) {
    docs.push({
      index: "slo-observability.sli-v1",
      ...generateData(currentDate, sloId, goodRatio),
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

const generateNewRollupData = async (sloId, toDate, goodRatio) => {
  const esClient = getEsClient();
  let lastDate = toDate;

  while (true) {
    const now = startOfMinute(new Date());
    if (isAfter(now, lastDate)) {
      lastDate = now;
      const res = await esClient.index({
        index: "slo-observability.sli-v1",
        pipeline: "slo-observability.sli.monthly",
        document: generateData(now, sloId, goodRatio),
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

// node index.js slo_id [min] [max]
(async function () {
  if (argv.length < 2) {
    throw new Error("slo id required");
  }

  const sloId = argv[2];
  const now = startOfMinute(new Date());

  const fromDate = sub(now, { months: 3 });
  const toDate = now;

  // randomly generate good events as a % of total events, between the limits
  const min = Math.max(argv[3] ?? 0.9, 0);
  const max = Math.min(argv[4] ?? 1, 1);
  if (min > max) {
    throw new Error(`Illegal min [${min}] max [${max}] values`);
  }
  const goodRatio = [min, max];

  await generateHistoricalRollupData(sloId, fromDate, toDate, goodRatio);
  await generateNewRollupData(sloId, toDate, goodRatio);
})();
