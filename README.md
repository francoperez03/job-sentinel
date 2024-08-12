# Job Sentinel

## Description

This project is an implementation of an automated alert system for MakerDAO, developed in TypeScript and deployed as an AWS Lambda function. Its goal is to monitor jobs on the Ethereum blockchain and send notifications to a Discord channel if any job in the master network has not been executed for the past 10 consecutive blocks.

## Project Structure

- **`app.ts`**: The main Lambda handler that processes incoming requests and invokes `JobService` to perform checks.
- **`src/services/job.service.ts`**: The primary service that manages the logic for checking inactive jobs.
- **`src/providers/discord.provider.ts`**: A provider responsible for sending notifications to a Discord channel using a webhook.
- **`src/providers/networks.provider.ts`**: A provider that interacts with the `Sequencer` contract to fetch the master network and other network details.
- **`src/providers/jobs.provider.ts`**: A provider that interacts with job contracts on the blockchain to check their "workable" status.

## Requirements

- **Node.js** (version 14.x or higher)
- **AWS CLI** configured with permissions to deploy Lambda functions
- **Ethers.js** to interact with the Ethereum blockchain
- **Axios** to send HTTP requests to Discord
- **dotenv** to manage environment variables

## Local Setup

### Install Dependencies

Run the following command to install the necessary dependencies:

```bash
npm install
```

### Docker Configuration
 
#### Prerequisites
Docker

##### Starting the Redis Server
To start the Redis server, navigate to the directory containing your docker-compose.yml file and run:

```bash
docker-compose up -d
```

This command will download the Redis image if not already present, and start a Redis container linked to the lambda-local network.

##### Stopping the Redis Server
To stop the Redis server and remove the containers, use:

```bash
docker-compose down
```


## Running Locally with AWS SAM
To test the Lambda function locally using AWS SAM, follow these steps:

### Build the SAM Application:

Run the following command to build the SAM application:

```bash
sam build
```

### Invoke the Lambda Function:

After building the application, you can invoke the Lambda function using the following script:

```bash
cd project
npm run check:job
```
This command will invoke the function with a predefined event and display the results in your terminal.

That's it! With these commands, you can build and test your Lambda function locally.


## Testing

This project includes a set of unit tests for key functionalities. You can run the tests using:

```bash
npm test
```
