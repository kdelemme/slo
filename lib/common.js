import { Client } from "@elastic/elasticsearch";

export async function waitFor(ms) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
}

export function getEsClient() {
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
}
