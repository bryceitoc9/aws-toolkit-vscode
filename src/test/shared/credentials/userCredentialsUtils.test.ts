/*!
 * Copyright 2018-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from 'assert'
import * as fs from 'fs-extra'
import * as path from 'path'

import { loadSharedConfigFiles, SharedConfigFiles } from '../../../shared/credentials/credentialsFile'
import { UserCredentialsUtils } from '../../../shared/credentials/userCredentialsUtils'
import { EnvironmentVariables } from '../../../shared/environmentVariables'
import { makeTemporaryToolkitFolder } from '../../../shared/filesystemUtilities'

describe('UserCredentialsUtils', function () {
    let tempFolder: string

    before(async function () {
        // Make a temp folder for all these tests
        // Stick some temp credentials files in there to load from
        tempFolder = await makeTemporaryToolkitFolder()
    })

    afterEach(async function () {
        const env = process.env as EnvironmentVariables
        delete env.AWS_SHARED_CREDENTIALS_FILE
        delete env.AWS_CONFIG_FILE
    })

    after(async function () {
        await fs.remove(tempFolder)
    })

    describe('findExistingCredentialsFilenames', function () {
        it('returns both filenames if both files exist', async function () {
            const credentialsFilename = path.join(tempFolder, 'credentials-both-exist-test')
            const configFilename = path.join(tempFolder, 'config-both-exist-test')

            const env = process.env as EnvironmentVariables
            env.AWS_SHARED_CREDENTIALS_FILE = credentialsFilename
            env.AWS_CONFIG_FILE = configFilename

            createCredentialsFile(credentialsFilename, ['default'])
            createCredentialsFile(configFilename, ['default'])

            const foundFiles: string[] = await UserCredentialsUtils.findExistingCredentialsFilenames()
            assert(foundFiles)
            assert.strictEqual(foundFiles.length, 2)
        })

        it('returns credentials file if it exists and config file does not exist', async function () {
            const credentialsFilename = path.join(tempFolder, 'credentials-exist-test')
            const configFilename = path.join(tempFolder, 'config-not-exist-test')

            const env = process.env as EnvironmentVariables
            env.AWS_SHARED_CREDENTIALS_FILE = credentialsFilename
            env.AWS_CONFIG_FILE = configFilename

            createCredentialsFile(credentialsFilename, ['default'])

            const foundFiles: string[] = await UserCredentialsUtils.findExistingCredentialsFilenames()
            assert(foundFiles)
            assert.strictEqual(foundFiles.length, 1)
            assert.strictEqual(foundFiles[0], credentialsFilename)
        })

        it('returns config file if it exists and credentials file does not exist', async function () {
            const credentialsFilename = path.join(tempFolder, 'credentials-not-exist-test')
            const configFilename = path.join(tempFolder, 'config-exist-test')

            const env = process.env as EnvironmentVariables
            env.AWS_SHARED_CREDENTIALS_FILE = credentialsFilename
            env.AWS_CONFIG_FILE = configFilename

            createCredentialsFile(configFilename, ['default'])

            const foundFiles: string[] = await UserCredentialsUtils.findExistingCredentialsFilenames()
            assert(foundFiles)
            assert.strictEqual(foundFiles.length, 1)
            assert.strictEqual(foundFiles[0], configFilename)
        })

        it('returns empty result if neither file exists', async function () {
            const credentialsFilename = path.join(tempFolder, 'credentials-not-exist-test')
            const configFilename = path.join(tempFolder, 'config-not-exist-test')

            const env = process.env as EnvironmentVariables
            env.AWS_SHARED_CREDENTIALS_FILE = credentialsFilename
            env.AWS_CONFIG_FILE = configFilename

            const foundFiles: string[] = await UserCredentialsUtils.findExistingCredentialsFilenames()
            assert(foundFiles)
            assert.strictEqual(foundFiles.length, 0)
        })
    })

    describe('generateCredentialsFile', function () {
        it('generates a valid credentials file', async function () {
            const credentialsFilename = path.join(tempFolder, 'credentials-generation-test')
            const profileName = 'someRandomProfileName'

            const env = process.env as EnvironmentVariables
            env.AWS_SHARED_CREDENTIALS_FILE = credentialsFilename
            const creds = {
                accessKey: '123',
                profileName: profileName,
                secretKey: 'ABC',
            }
            await UserCredentialsUtils.generateCredentialsFile(creds)

            const sharedConfigFiles: SharedConfigFiles = await loadSharedConfigFiles()
            assert(typeof sharedConfigFiles === 'object', 'sharedConfigFiles should be an object')
            const profiles = sharedConfigFiles.credentialsFile
            assert(typeof profiles === 'object', 'profiles should be an object')
            assert(profiles[profileName], 'profiles should be truthy')
            assert.strictEqual(
                profiles[profileName].aws_access_key_id,
                creds.accessKey,
                `creds.accessKey: "${profiles[profileName].aws_access_key_id}" !== "${creds.accessKey}"`
            )
            assert.strictEqual(
                profiles[profileName].aws_secret_access_key,
                creds.secretKey,
                `creds.secretKey: "${profiles[profileName].aws_access_key_id}" !== "${creds.secretKey}"`
            )
            await fs.access(credentialsFilename, fs.constants.R_OK).catch(_err => assert(false, 'Should be readable'))
            await fs.access(credentialsFilename, fs.constants.W_OK).catch(_err => assert(false, 'Should be writeable'))
        })
    })

    function createCredentialsFile(filename: string, profileNames: string[]): void {
        let fileContents = ''

        profileNames.forEach(profileName => {
            fileContents += `[${profileName}]
aws_access_key_id = FAKEKEY
aws_secret_access_key = FAKESECRET
`
        })

        fs.writeFileSync(filename, fileContents)
    }
})
