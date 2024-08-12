import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JobService } from './services/jobs.service';
import setupProviders from './providers'

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('-------START------');
        const { networkProvider, jobProvider, notificationProvider} = await setupProviders()
        const jobService = new JobService(networkProvider, jobProvider, notificationProvider)
        const jobs = await jobService.checkInactiveJobs();
        console.log('-------END------');

        return {
            statusCode: 200,
            body: JSON.stringify(jobs),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'BAD_REQUEST',
            }),
        };
    }
};
