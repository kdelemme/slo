const { Client } = require("@elastic/elasticsearch");
const { randomUUID } = require("crypto");
const { format, add, sub, isBefore } = require("date-fns");
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
  let createdDoc = 0;
  let currentDate = FROM_DATE;

  while (isBefore(currentDate, TO_DATE)) {
    await esClient.create({
      id: randomUUID(),
      index: "slo-observability.sli-v1",
      document: getDocument(currentDate, SLO_ID, 90, 100),
    });
    currentDate = add(currentDate, { minutes: 1 });
    createdDoc++;
  }

  console.log("created %d for slo [%s]", createdDoc, SLO_ID);
};

(async function () {
  await indexRollupData();
})();
