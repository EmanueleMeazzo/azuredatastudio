/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as nock from 'nock';
import * as os from 'os';
import * as should from 'should';
import * as sinon from 'sinon';
import { PassThrough } from 'stream';
import * as TypeMoq from 'typemoq';
import * as vscode from 'vscode';
import { HttpClient } from '../../common/httpClient';
import { Deferred } from '../../common/promise';

describe('HttpClient', function (): void {

	let outputChannelMock: TypeMoq.IMock<vscode.OutputChannel>;

	before(function (): void {
		outputChannelMock = TypeMoq.Mock.ofType<vscode.OutputChannel>();
		if (process.env.SendOutputChannelToConsole) {
			outputChannelMock.setup(x => x.appendLine(TypeMoq.It.isAnyString())).callback((x => {
				console.log(`Output Channel:${x}`);
			}));
		}
	});

	afterEach(function (): void {
		nock.cleanAll();
		nock.enableNetConnect();
		sinon.restore();
	});

	describe('downloadFile', function (): void {
		it('downloads file successfully', async function (): Promise<void> {
			nock('https://127.0.0.1')
				.get('/README.md')
				.replyWithFile(200, __filename);
			const downloadFolder = os.tmpdir();
			const downloadPath = await HttpClient.downloadFile('https://127.0.0.1/README.md', outputChannelMock.object, downloadFolder);
			// Verify file was downloaded correctly
			await fs.promises.stat(downloadPath);
		});

		it('errors on response stream error', async function (): Promise<void> {
			const downloadFolder = os.tmpdir();
			nock('https://127.0.0.1')
				.get('/')
				.replyWithError('Unexpected Error');
			const downloadPromise = HttpClient.downloadFile('https://127.0.0.1', outputChannelMock.object, downloadFolder);
			await should(downloadPromise).be.rejected();
		});

		it('rejects on non-OK status code', async function (): Promise<void> {
			const downloadFolder = os.tmpdir();
			nock('https://127.0.0.1')
				.get('/')
				.reply(404, '');
			const downloadPromise = HttpClient.downloadFile('https://127.0.0.1', outputChannelMock.object, downloadFolder);
			await should(downloadPromise).be.rejected();
		});

		it('errors on write stream error', async function (): Promise<void> {
			const downloadFolder = os.tmpdir();
			const mockWriteStream = new PassThrough();
			const deferredPromise = new Deferred();
			sinon.stub(fs, 'createWriteStream').callsFake(() => {
				deferredPromise.resolve();
				return <any>mockWriteStream;
			});
			nock('https://127.0.0.1')
				.get('/')
				.reply(200, '');
			const downloadPromise = HttpClient.downloadFile('https://127.0.0.1', outputChannelMock.object, downloadFolder);
			// Wait for the stream to be created before throwing the error or HttpClient will miss the event
			await deferredPromise;
			try {
				// Passthrough streams will throw the error we emit so just no-op and
				// let the HttpClient handler handle the error
				mockWriteStream.emit('error', 'Unexpected write error');
			} catch (err) { }
			await should(downloadPromise).be.rejected();
		});
	});

	describe('getFilename', function (): void {
		it('Gets filename correctly', async function (): Promise<void> {
			const filename = 'azdata-cli-20.0.0.msi';
			nock('https://127.0.0.1')
				.get(`/${filename}`)
				.reply(200);
			const receivedFilename = await HttpClient.getFilename(`https://127.0.0.1/${filename}`, outputChannelMock.object);
			should(receivedFilename).equal(filename);
		});

		it('rejects on response error', async function (): Promise<void> {
			nock('https://127.0.0.1')
				.get('/')
				.replyWithError('Unexpected Error');
			const getFilenamePromise = HttpClient.getFilename('https://127.0.0.1', outputChannelMock.object);
			await should(getFilenamePromise).be.rejected();
		});

		it('rejects on non-OK status code', async function (): Promise<void> {
			nock('https://127.0.0.1')
				.get('/')
				.reply(404, '');
			const getFilenamePromise = HttpClient.getFilename('https://127.0.0.1', outputChannelMock.object);
			await should(getFilenamePromise).be.rejected();
		});
	});

	describe('getTextContent', function (): void {
		it.skip('Gets file contents correctly', async function (): Promise<void> {
			//const urlBody = 'An arbitrary test string';
			nock('https://127.0.0.1')
				.get('/arbitraryFile')
				.replyWithFile(200, __filename);
			const receivedContents = await HttpClient.getTextContent(`https://127.0.0.1/arbitraryFile`, outputChannelMock.object);
			console.log(`received fileContents:${receivedContents}`);
			should(receivedContents).equal(await fs.promises.readFile(__filename));
		});

		it('rejects on response error', async function (): Promise<void> {
			nock('https://127.0.0.1')
				.get('/')
				.replyWithError('Unexpected Error');
			const getFileContentsPromise = HttpClient.getTextContent('https://127.0.0.1/', outputChannelMock.object);
			await should(getFileContentsPromise).be.rejected();
		});

		it('rejects on non-OK status code', async function (): Promise<void> {
			nock('https://127.0.0.1')
				.get('/')
				.reply(404, '');
			const getFileContentsPromise = HttpClient.getTextContent('https://127.0.0.1/', outputChannelMock.object);
			await should(getFileContentsPromise).be.rejected();
		});
	});
});
