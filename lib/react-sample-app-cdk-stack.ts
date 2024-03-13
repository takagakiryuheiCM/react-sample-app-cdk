import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment'
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigatewayv2_authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as dotenv from 'dotenv';

dotenv.config()

export class ReactSampleAppCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケットの作成
    const bucket = new s3.Bucket(this, 'ReactAppBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
    });

    // CloudFront ディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'ReactAppDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responsePagePath: '/index.html',
          responseHttpStatus: 200
        }
      ]
    });

    // ReactアプリケーションをS3バケットにデプロイ
    new s3deploy.BucketDeployment(this, 'DeployReactApp', {
      sources: [s3deploy.Source.asset('../react-sample-app/build')],
      destinationBucket: bucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Lambdaの作成
    const lambdaFunction = new NodejsFunction(this, 'function', {
      entry: "lib/lambda/hello.ts",
      runtime: Runtime.NODEJS_20_X,
    });


    // JWTオーソライザーの作成
    const jwtAuthorizer = new apigatewayv2_authorizers.HttpJwtAuthorizer('JwtAuthorizer', "https://accounts.google.com", {
      jwtAudience: [process.env.CLIENT_ID!], // 自分のクライアントID
    });

    // 統合の作成
    const lambdaIntegration = new integrations.HttpLambdaIntegration('LambdaIntegration', lambdaFunction)

    // CORS設定の作成
    const corsPreflight = {
      allowOrigins: ['*', 'http://127.0.0.1:3000'],
      allowHeaders: ['authorization', 'content-type', 'x-amz-date', 'x-requested-with', 'origin', 'accept'],
      allowMethods: [apigatewayv2.CorsHttpMethod.ANY, apigatewayv2.CorsHttpMethod.OPTIONS],
      maxAge: cdk.Duration.seconds(0),
      allowCredentials: false,
    };

    // API Gatewayの作成
    const apiGateway = new apigatewayv2.HttpApi(this, 'ApiGateway', {
      corsPreflight: corsPreflight
    });

    // anyルーティング作成
    apiGateway.addRoutes({
      path: '/react-sample-app',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
      authorizer: jwtAuthorizer,
    });

    // optionルーティング作成
    apiGateway.addRoutes({
      path: '/react-sample-app',
      methods: [apigatewayv2.HttpMethod.OPTIONS],
      integration: lambdaIntegration,
    });
  }
}
