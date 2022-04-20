import { GraphQLClient, gql } from "graphql-request";

export async function getBlockForTimestamp(timestamp) {
  const getBlockQuery = gql`
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
  //console.log(getBlockQuery);
  const endpoint =
    "https://graph-node.beets-ftm-node.com/subgraphs/name/fantom-blocks";

  const client = new GraphQLClient(endpoint);
  const data = await client.request(getBlockQuery);
  return data.blocks[0].number;
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

  //console.log(response.pools);
  return response.pools;
}
