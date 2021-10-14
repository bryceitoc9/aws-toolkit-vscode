/*!
 * Copyright 2021 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as assert from 'assert'
import { Prompter, PromptResult } from '../../../shared/ui/prompter'
import { StepEstimator } from '../../../shared/wizards/wizard'

export class SimplePrompter<T> extends Prompter<T> {
    constructor(private readonly input: T | PromptResult<T>) {
        super()
    }
    protected async promptUser(): Promise<PromptResult<T>> {
        return this.input
    }
    public setSteps(current: number, total: number): void {}
    public setStepEstimator(estimator: StepEstimator<T>): void {}
    public set recentItem(response: any) {}
    public get recentItem(): any {
        return undefined
    }
}

describe('Prompter', function () {
    it('returns a value', async function () {
        const prompter = new SimplePrompter(1)
        assert.strictEqual(await prompter.prompt(), 1)
    })

    it('can map one type to another', async function () {
        const prompter = new SimplePrompter(1).transform(resp => resp.toString())
        assert.strictEqual(await prompter.prompt(), '1')
    })

    it('throws error if calling prompt multiple times', async function () {
        const prompter = new SimplePrompter(1)
        await prompter.prompt()
        await assert.rejects(prompter.prompt())
    })

    it('can attach multiple transformations', async function () {
        const prompter = new SimplePrompter(1)
        prompter
            .transform(resp => resp * 2)
            .transform(resp => resp + 2)
            .transform(resp => resp * 2)
            .transform(resp => resp - 2)
            .transform(resp => resp.toString())
            .transform(resp => `result: ${resp}`)
        assert.strictEqual(await prompter.prompt(), 'result: 6')
    })

    it('can attach callbacks after a response', async function () {
        let sum = 0
        const prompter = new SimplePrompter(1)
        prompter
            .after(resp => (sum += resp))
            .after(resp => (sum += resp))
            .after(resp => (sum += resp))

        const result = await prompter.prompt()
        assert.strictEqual(result, 1, 'Callbacks should not change the response')
        assert.strictEqual(sum, 3)
    })

    it('applies callbacks in the correct order', async function () {
        let sum = 0
        const prompter = new SimplePrompter(1)
        prompter
            .after(resp => (sum += resp))
            .transform(resp => resp * 2)
            .after(resp => (sum += resp * 2))

        const result = await prompter.prompt()
        assert.strictEqual(result, 2)
        assert.strictEqual(sum, 5)
    })
})
