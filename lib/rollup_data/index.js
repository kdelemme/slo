const { Client } = require("@elastic/elasticsearch");
const { randomUUID } = require("crypto");
const { add, sub, isBefore, isAfter, isEqual } = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");

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

const generateData = (date, sloId, errorSpikeDateRange) => {
  let numerator = 100;
  if (
    (isAfter(date, errorSpikeDateRange[0]) ||
      isEqual(date, errorSpikeDateRange[0])) &&
    (isBefore(date, errorSpikeDateRange[1]) ||
      isEqual(date, errorSpikeDateRange[1]))
  ) {
    numerator = 0;
  }
  const denominator = 100;
  return {
    "@timestamp": formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:00.000'Z'"),
    slo: {
      context: {},
      id: sloId,
      numerator,
      denominator,
    },
  };
};

const generateRollupData = async (
  sloId,
  fromDate,
  toDate,
  errorSpikeDateRange
) => {
  const esClient = getEsClient();
  let docs = [];
  let currentDate = fromDate;

  while (isBefore(currentDate, toDate)) {
    docs.push({
      index: "slo-observability.sli-v1",
      ...generateData(currentDate, sloId, errorSpikeDateRange),
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
    "created %d/%d documents for slo [%s] in %dms",
    result.total,
    result.successful,
    sloId,
    result.time
  );
};

(async function () {
  const sloId = randomUUID();
  const now = new Date();

  const fromDate = sub(now, { days: 2 });
  const toDate = now;

  const errorSpikeDateRange = [
    sub(now, { minutes: 5 }),
    sub(now, { minutes: 0 }),
  ];

  await generateRollupData(sloId, fromDate, toDate, errorSpikeDateRange);
})();
