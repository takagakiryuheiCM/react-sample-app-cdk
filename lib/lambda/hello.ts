export const handler = async (event: any) => {


  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
      },
      body: JSON.stringify('Hello from Lambda!')
    };
  }

  const response = {
    statusCode: 200,
    body: JSON.stringify('Hello from Lambda!'),
  };
  return response;
};
