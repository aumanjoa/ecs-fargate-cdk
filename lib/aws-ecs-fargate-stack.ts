import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";

import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AwsEcsFargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // devinde vpc for the ecs task
    const vpc = new ec2.Vpc(this, "ecs-vps", {
      maxAzs: 2 // Default is all AZs in region
    });

    // role for the ecs task
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    taskRole.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
    });
    const executionRole = new iam.Role(this, 'ExecutionkRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    executionRole.addManagedPolicy({
      managedPolicyArn: 'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy',
    });

    //create ecs cluster
    const cluster = new ecs.Cluster(this, "ecs-cluster", {
      vpc: vpc
    });

    //create ecs task definition
    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDefinition', {
      taskRole,
      executionRole,
      compatibility: ecs.Compatibility.FARGATE,
      cpu: '512',
      memoryMiB: '2048',
    });

    //create a task definition
    // use an example container: https://gallery.ecr.aws/ecs-sample-image/amazon-ecs-sample
    const nodeServiceContainer = taskDefinition.addContainer('ecs-sample-app', {
      //image: ecs.ContainerImage.fromEcrRepository(repository, ''),
      image: ecs.ContainerImage.fromRegistry("amazon/amazon-ecs-sample"),
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'amazon-ecs-sample',
      }),
      environment: {
        'region': this.region,
      }
    });

    nodeServiceContainer.addPortMappings({
      containerPort: 80,
    });

    //create a capacityProviderStrategies for fargate spot ract
    const capacityProviderStrategies = [{
      capacityProvider: 'FARGATE_SPOT',
      weight: 1,
    }];

    const ecsService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'ecs-fargate-service', {
      cluster,
      taskDefinition,
      capacityProviderStrategies: capacityProviderStrategies,
    });

    //health endpoint
    ecsService.targetGroup.configureHealthCheck({
      path: '/',
      interval: cdk.Duration.seconds(10),
      timeout: cdk.Duration.seconds(5)
    });

    // Add autoscaling
    const scaling = ecsService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10
    });

    // Scale on CPU utilization
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 50
    });

  }
}
