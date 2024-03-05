# AWS ECS Fargate Stack

This AWS CDK stack sets up an Amazon ECS Fargate cluster for managing containers. It includes the necessary VPC, IAM roles, and ECS task definition.

## Prerequisites

Before deploying this stack, ensure you have the following:

1. **AWS CDK**: Make sure you have the AWS Cloud Development Kit (CDK) installed.

## Stack Components

### 1. VPC (ecs-vps)

- Spans 2 Availability Zones for improved availability.
- Adjust `maxAzs` based on regional availability and needs.

### 2. IAM Roles

- **TaskRole**: Provides access to resources needed for task execution.
- **ExecutionRole**: Grants additional permissions for task execution.
- Both roles use the managed policy `AmazonECSTaskExecutionRolePolicy`.

### 3. ECS Cluster (ecs-cluster)

- Manages containers within the specified VPC.

### 4. ECS Task Definition (TaskDefinition)

- Defines container configuration and resource requirements.
- Utilizes Fargate compatibility for serverless compute.
- Assigns the previously created IAM roles.

## Usage

1. Install dependencies: `npm install`
2. Deploy the stack: `cdk deploy AwsEcsFargateStack`
