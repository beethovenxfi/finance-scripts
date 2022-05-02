import { GraphQLClient, gql } from "graphql-request";
import moment from "moment-timezone";

export async function getBlockForCurrentDate() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1);
  return getBlockForDate(startDate);
}

export async function getBlockForDate(startDate) {
  let timestamp = 0;
  const runDateUTC = moment.tz(startDate, "GMT").startOf("day");
  startDate.setDate(startDate.getDate() + 1);
  timestamp = moment.tz(startDate, "GMT").startOf("day").unix();

  const blockNumber = await getBlockForTimestamp(timestamp);

  console.log("import run:%s, %i", runDateUTC.format(), timestamp, blockNumber);

  return { blockNumber, timestamp, runDateUTC };
}

export async function getAllPools(blockNumber) {
  const getPoolsQuery = gql`
    query getpools($blocknumber: Int!) {
      pools(
        first: 5
        orderDirection: desc
        orderBy: totalLiquidity
        block: { number: $blocknumber }
        where: { totalLiquidity_gt: 1 }
      ) {
        name
        address
        poolType
        swapFee
        swapsCount
        symbol
        totalLiquidity
        totalShares
        totalSwapFee
        totalSwapVolume
      }
    }
  `;

  const endpoint =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/beethovenx";

  const client = new GraphQLClient(endpoint);

  const variables = { blocknumber: Number(blockNumber) };

  const response = await client.request(getPoolsQuery, variables);

  return response.pools;
}

export async function getEmmisionsData(blockNumber) {
  const getEmmisionsQuery = gql`
    query getEmmisions($blocknumber: Int!) {
      pools(block: { number: $blocknumber }, where: { rewarder_gte: "0" }) {
        pair
        allocPoint
        rewarder {
          rewardTokens {
            token
            symbol
            rewardPerSecond
          }
        }
      }
    }
  `;

  const endpoint =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/masterchefV2";

  const client = new GraphQLClient(endpoint);

  const variables = { blocknumber: Number(blockNumber) };

  const response = await client.request(getEmmisionsQuery, variables);

  return response.pools;
}

function blockQuery(timestamp) {
  return gql`
query getblock {
  blocks(orderBy: timestamp,
    orderDirection: desc,
    where: { timestamp_gt: ${timestamp - 4},
             timestamp_lt: ${timestamp + 4} }) {
    number
    timestamp
  }
}
`;
}

async function getBlockForTimestamp(timestamp) {
  const endpoint =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/fantom-blocks";

  const client = new GraphQLClient(endpoint);
  const data = await client.request(blockQuery(timestamp));
  return data.blocks[0].number;
}
