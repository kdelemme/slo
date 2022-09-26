const { Client } = require("@elastic/elasticsearch");
const { randomUUID } = require("crypto");
const { add, sub, isBefore } = require("date-fns");
const { formatInTimeZone } = require("date-fns-tz");

const SLO_ID = randomUUID();
const FROM_DATE = sub(new Date(), { days: 2 });
const TO_DATE = new Date();

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

const getDocument = (date, sloId, numerator, denominator) => ({
  "@timestamp": formatInTimeZone(date, "UTC", "yyyy-MM-dd'T'HH:mm:00.000'Z'"),
  slo: {
    context: {},
    id: sloId,
    numerator,
    denominator,
  },
});

const indexRollupData = async () => {
  const esClient = getEsClient();
  let docs = [];
  let currentDate = FROM_DATE;

  while (isBefore(currentDate, TO_DATE)) {
    docs.push({
      index: "slo-observability.sli-v1",
      ...getDocument(currentDate, SLO_ID, 90, 100),
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
    SLO_ID,
    result.time
  );
};

(async function () {
  await indexRollupData();
})();
