import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as iam from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';

export class AwsEcsFargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // **VPC for hosting the ECS tasks:**
    // - Spans 2 Availability Zones for improved availability.
    // - Adjust maxAzs based on regional availability and needs.
    const vpc = new ec2.Vpc(this, 'ecs-vps', { maxAzs: 2 });

    // **IAM Roles for ECS tasks:**
    // - TaskRole: Access to resources needed for task execution.
    // - ExecutionRole: Additional permissions for task execution.
    // - Both roles use the managed policy AmazonECSTaskExecutionRolePolicy.
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

    // **ECS Cluster for managing containers:**
    const cluster = new ecs.Cluster(this, 'ecs-cluster', { vpc: vpc });

    // **ECS Task Definition:**
    // - Outlines container configuration and resource requirements.
    // - Uses Fargate compatibility for serverless compute.
    // - Assigns the previously created IAM roles.
    const taskDefinition = new ecs.TaskDefinition(this, 'TaskDefinition', {
      taskRole,
      executionRole,
      compatibility: ecs.Compatibility.FARGATE,
      cpu: '512',
      memoryMiB: '2048',
    });

    // **Container within the Task Definition:**
    // - Uses a sample image from Amazon ECR Public Gallery for demonstration.
    // - Sets up logging for container output.
    // - Injects the AWS region as an environment variable.
    const nodeServiceContainer = taskDefinition.addContainer('ecs-sample-app', {
      image: ecs.ContainerImage.fromRegistry('amazon/amazon-ecs-sample'),
      logging: new ecs.AwsLogDriver({ streamPrefix: 'amazon-ecs-sample' }),
      environment: { region: this.region },
    });

    // Exposes container port 80 for external access.
    nodeServiceContainer.addPortMappings({ containerPort: 80 });

    // **Load Balanced Fargate Service:**
    // - Deploys the ECS task in an autoscaling, load-balanced configuration.
    // - Leverages Fargate Spot for potential cost savings.
    const ecsService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, 'ecs-fargate-service', {
      cluster,
      taskDefinition,
      capacityProviderStrategies: [{ capacityProvider: 'FARGATE_SPOT', weight: 1 }],
    });

    // **Health Check for service monitoring:**
    ecsService.targetGroup.configureHealthCheck({
      path: '/',
      interval: cdk.Duration.seconds(10),
      timeout: cdk.Duration.seconds(5),
    });

   // Add autoscaling
    const scaling = ecsService.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 10
    });

    // **Autoscaling for dynamic resource allocation:**
    scaling.scaleOnCpuUtilization('CpuScaling', { targetUtilizationPercent: 50 });
  }
}
