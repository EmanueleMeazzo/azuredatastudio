/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as should from 'should';
import * as sinon from 'sinon';
import { searchForCmd as searchForExe } from '../../common/utils';

describe('utils', function () {
	afterEach(function (): void {
		sinon.restore();
	});
	describe('searchForExe', function (): void {
		it('finds exe successfully', async function (): Promise<void> {
			await searchForExe('node');
		});
		it('throws for non-existent exe', async function (): Promise<void> {
			await should(searchForExe('someFakeExe')).be.rejected();
		});
	});
});
