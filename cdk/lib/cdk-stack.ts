import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { CfnApp, CfnBranch, CfnDomain } from "aws-cdk-lib/aws-amplify";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { BuildSpec } from "aws-cdk-lib/aws-codebuild";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    const githubToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      `github-access-token`,
      `sample-amplify-github-token`,
    ).secretValue.unsafeUnwrap();

    const amplifyApp = new CfnApp(this, "AmplifyApp", {
      name: 'sample-amplify-nextjs',
      oauthToken: githubToken,
      repository: "https://github.com/kodai305/amplify-nextjs",
      environmentVariables: [
        {
          name: "AMPLIFY_MONOREPO_APP_ROOT",
          value: "nextjs-blog",
        },
      ],
      buildSpec: BuildSpec.fromObjectToYaml({
        version: 1,
        applications: [
          {
            appRoot: "nextjs-blog",
            frontend: {
              phases: {
                preBuild: {
                  commands: ["npm run setup", "yarn install"],
                },
                build: {
                  commands: [
                    "npm run build",
                  ],
                },
              },
              artifacts: {
                baseDirectory: ".next",
                files: ["**/*"],
              },
              cache: {
                paths: ["node_modules/**/*"],
              },
            },
          },
        ],
      }).toBuildSpec(),
      platform: "WEB_COMPUTE",
      customRules: [
        {
          source: "/<*>",
          target: "/index.html",
          status: "404-200",
        },
      ],
    });

    const amplifyBranch = new CfnBranch(this, "AmplifyBranch", {
      appId: amplifyApp.attrAppId,
      branchName: 'main',
      framework: "Next.js - SSR",
      enableAutoBuild: false,
    });

    const amplifyDomain = new CfnDomain(this, "AmplifyDomain", {
      appId: amplifyApp.attrAppId,
      domainName: 'compilebook.com',
      subDomainSettings: [
        {
          branchName: 'feature',
          prefix: "admin",
        },
      ],
      enableAutoSubDomain: false,
    });

    amplifyDomain.addDependency(amplifyBranch);
  }
}

