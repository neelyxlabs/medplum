import { Bot } from '@medplum/fhirtypes';
import { randomUUID } from 'crypto';
import express from 'express';
import request from 'supertest';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { InvokeCommand, LambdaClient, ListLayerVersionsCommand } from '@aws-sdk/client-lambda';

import { initApp, shutdownApp } from '../../app';
import { registerNew } from '../../auth/register';
import { getConfig, loadTestConfig } from '../../config';
import { initTestAuth } from '../../test.setup';
import { getLambdaFunctionName } from './execute';

const app = express();
let accessToken: string;
let bot: Bot;

describe('Execute', () => {
  let mockLambdaClient: AwsClientStub<LambdaClient>;

  beforeEach(() => {
    mockLambdaClient = mockClient(LambdaClient);

    mockLambdaClient.on(ListLayerVersionsCommand).resolves({
      LayerVersions: [
        {
          LayerVersionArn: 'xyz',
        },
      ],
    });

    mockLambdaClient.on(InvokeCommand).callsFake(({ Payload }) => {
      const decoder = new TextDecoder();
      const event = JSON.parse(decoder.decode(Payload));
      const output = typeof event.input === 'string' ? event.input : JSON.stringify(event.input);
      const encoder = new TextEncoder();

      return {
        LogResult: `U1RBUlQgUmVxdWVzdElkOiAxNDZmY2ZjZi1jMzJiLTQzZjUtODJhNi1lZTBmMzEzMmQ4NzMgVmVyc2lvbjogJExBVEVTVAoyMDIyLTA1LTMwVDE2OjEyOjIyLjY4NVoJMTQ2ZmNmY2YtYzMyYi00M2Y1LTgyYTYtZWUwZjMxMzJkODczCUlORk8gdGVzdApFTkQgUmVxdWVzdElkOiAxNDZmY2ZjZi1jMzJiLTQzZjUtODJhNi1lZTBmMzEzMmQ4NzMKUkVQT1JUIFJlcXVlc3RJZDogMTQ2ZmNmY2YtYzMyYi00M2Y1LTgyYTYtZWUwZjMxMzJkODcz`,
        Payload: encoder.encode(output),
      };
    });
  });

  afterEach(() => {
    mockLambdaClient.restore();
  });

  beforeAll(async () => {
    const config = await loadTestConfig();
    await initApp(app, config);
    accessToken = await initTestAuth();

    const res = await request(app)
      .post(`/fhir/R4/Bot`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        resourceType: 'Bot',
        identifier: [{ system: 'https://example.com/bot', value: randomUUID() }],
        name: 'Test Bot',
        runtimeVersion: 'awslambda',
        code: `
          export async function handler(medplum, event) {
            console.log('input', event.input);
            return event.input;
          }
        `,
      });
    expect(res.status).toBe(201);
    bot = res.body as Bot;
  });

  afterAll(async () => {
    await shutdownApp();
  });

  test('Submit plain text', async () => {
    const res = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$execute`)
      .set('Content-Type', 'text/plain')
      .set('Authorization', 'Bearer ' + accessToken)
      .send('input');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.text).toEqual('input');
  });

  test('Submit FHIR with content type', async () => {
    const res = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$execute`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        resourceType: 'Patient',
        name: [{ given: ['John'], family: ['Doe'] }],
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/fhir+json; charset=utf-8');
  });

  test('Submit FHIR without content type', async () => {
    const res = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$execute`)
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        resourceType: 'Patient',
        name: [{ given: ['John'], family: ['Doe'] }],
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/json; charset=utf-8');
  });

  test('Submit HL7', async () => {
    const text =
      'MSH|^~\\&|Main_HIS|XYZ_HOSPITAL|iFW|ABC_Lab|20160915003015||ACK|9B38584D|P|2.6.1|\r' +
      'MSA|AA|9B38584D|Everything was okay dokay!|';

    const res = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$execute`)
      .set('Content-Type', 'x-application/hl7-v2+er7')
      .set('Authorization', 'Bearer ' + accessToken)
      .send(text);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('x-application/hl7-v2+er7; charset=utf-8');
  });

  test('Execute without code', async () => {
    // Create a bot with empty code
    const res1 = await request(app)
      .post(`/fhir/R4/Bot`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        resourceType: 'Bot',
        name: 'Test Bot',
        code: '',
      });
    expect(res1.status).toBe(201);
    const bot = res1.body as Bot;

    // Execute the bot
    const res2 = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$execute`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({});
    expect(res2.status).toBe(400);
  });

  test('Unsupported runtime version', async () => {
    const res1 = await request(app)
      .post(`/fhir/R4/Bot`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({
        resourceType: 'Bot',
        name: 'Test Bot',
        runtimeVersion: 'unsupported',
        code: `
        export async function handler() {
          console.log('input', input);
          return input;
        }
        `,
      });
    expect(res1.status).toBe(201);
    const bot = res1.body as Bot;

    // Step 2: Publish the bot
    const res2 = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$deploy`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({});
    expect(res2.status).toBe(200);

    // Step 3: Execute the bot
    const res3 = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$execute`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({});
    expect(res3.status).toBe(400);
  });

  test('Bots not enabled', async () => {
    // First, Alice creates a project
    const { project, accessToken } = await registerNew({
      firstName: 'Alice',
      lastName: 'Smith',
      projectName: 'Alice Project',
      email: `alice${randomUUID()}@example.com`,
      password: 'password!@#',
    });

    // Next, Alice creates a bot
    const res2 = await request(app)
      .post('/admin/projects/' + project.id + '/bot')
      .set('Authorization', 'Bearer ' + accessToken)
      .type('json')
      .send({
        name: 'Alice personal bot',
        description: 'Alice bot description',
      });
    expect(res2.status).toBe(201);
    expect(res2.body.resourceType).toBe('Bot');
    expect(res2.body.id).toBeDefined();
    expect(res2.body.code).toBeDefined();

    // Try to execute the bot
    // This should fail because bots are not enabled
    const res3 = await request(app)
      .post(`/fhir/R4/Bot/${res2.body.id}/$execute`)
      .set('Content-Type', 'application/fhir+json')
      .set('Authorization', 'Bearer ' + accessToken)
      .send({});
    expect(res3.status).toBe(400);
    expect(res3.body.issue[0].details.text).toEqual('Bots not enabled');
  });

  test('Get function name', async () => {
    const config = getConfig();
    const normalBot: Bot = { resourceType: 'Bot', id: '123' };
    const customBot: Bot = {
      resourceType: 'Bot',
      id: '456',
      identifier: [{ system: 'https://medplum.com/bot-external-function-id', value: 'custom' }],
    };

    expect(getLambdaFunctionName(normalBot)).toEqual('medplum-bot-lambda-123');
    expect(getLambdaFunctionName(customBot)).toEqual('medplum-bot-lambda-456');

    // Temporarily enable custom bot support
    config.botCustomFunctionsEnabled = true;
    expect(getLambdaFunctionName(normalBot)).toEqual('medplum-bot-lambda-123');
    expect(getLambdaFunctionName(customBot)).toEqual('custom');
    config.botCustomFunctionsEnabled = false;
  });

  test('Execute by identifier', async () => {
    const res = await request(app)
      .post(`/fhir/R4/Bot/$execute?identifier=${bot.identifier?.[0]?.system}|${bot.identifier?.[0]?.value}`)
      .set('Content-Type', 'text/plain')
      .set('Authorization', 'Bearer ' + accessToken)
      .send('input');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/plain; charset=utf-8');
    expect(res.text).toEqual('input');
  });

  test('Missing parameters', async () => {
    const res = await request(app)
      .post(`/fhir/R4/Bot/$execute`)
      .set('Content-Type', 'text/plain')
      .set('Authorization', 'Bearer ' + accessToken)
      .send('input');
    expect(res.status).toBe(400);
    expect(res.body.issue[0].details.text).toEqual('Must specify bot ID or identifier.');
  });

  test('GET request with query params', async () => {
    const res = await request(app)
      .get(`/fhir/R4/Bot/${bot.id}/$execute?foo=bar`)
      .set('Authorization', 'Bearer ' + accessToken);
    expect(res.status).toBe(200);
    expect(res.body.foo).toBe('bar');
  });

  test('POST request with extra path', async () => {
    const res = await request(app)
      .post(`/fhir/R4/Bot/${bot.id}/$execute/RequestGroup`)
      .set('Authorization', 'Bearer ' + accessToken)
      .set('Content-Type', 'application/fhir+json')
      .send({ foo: 'bar' });
    expect(res.status).toBe(200);
    expect(res.body.foo).toBe('bar');
  });
});
