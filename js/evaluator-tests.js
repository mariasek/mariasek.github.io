"use strict"

import { Hundred, IndexOption } from './types.js'
import { SimpleEvaluator } from './main.mjs'

export class Tests {
    /**
     * @type {TestRecord[]}
     */
    records = [
        {
            play: 'e',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: {accepted: true, comment: null, ownValue: -120, enemyValue: 60}
        },
        {
            play: 'e{comment}',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: 'comment', ownValue: -120, enemyValue: 60 }
        },
        {
            play: 'e{{comment}',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: '{comment', ownValue: -120, enemyValue: 60 }
        },
        {
            play: 'e{}comment}',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: false, comment: null, ownValue: 0, enemyValue: 0 }
        },
        {
            play: 'e1',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: false, comment: null, ownValue: 0, enemyValue: 0 }
        },
        {
            play: 'r1',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -200, enemyValue: 100 }
        },
        {
            play: 'r2',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -1000, enemyValue: 500 }
        },
        {
            play: 'r2{}',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: '', ownValue: -1000, enemyValue: 500 }
        },
        {
            play: '+1s-h*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 120, enemyValue: -60 }
        },
        {
            play: '+s-1h',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 0, enemyValue: 0 }
        },
        {
            play: '$:-2s$:+h*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -260, enemyValue: 0 }
        },
        {
            play: '$-2s$:-h*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -340, enemyValue: 0 }
        },
        {
            play: '$:-1c',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -450, enemyValue: 0 }
        },
        {
            play: '+c',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 300, enemyValue: -150 }
        },
        {
            play: '-msc',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -300, enemyValue: 150 }
        },
        {
            play: '-4msc',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -4800, enemyValue: 2400 }
        },
        {
            play: '$:-c',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -150, enemyValue: 0 }
        },
        {
            play: '$:-2mc',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -1050, enemyValue: 0 }
        },
        {
            play: '$+3d',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 4800, enemyValue: 0 }
        },
        {
            play: '-k120',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -320, enemyValue: 160 }
        },
        {
            play: '+k0',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 30000, enemyValue: -15000 }
        },
        {
            play: '$:-k100',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -40, enemyValue: 0 }
        },
        {
            play: '$:-k110',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -80, enemyValue: 0 }
        },
        {
            play: '$:-k90',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -40, enemyValue: 0 }
        },
        {
            play: '$:-k80',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -80, enemyValue: 0 }
        },
        {
            play: '$:+k80',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 80, enemyValue: 0 }
        },
        {
            play: '$:-k110*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -160, enemyValue: 0 }
        },
        {
            play: '$:-1k110*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -480, enemyValue: 0 }
        },
        {
            play: '$:-1k130*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -480 * 4, enemyValue: 0 }
        },
        {
            play: '-1k10',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -30000, enemyValue: 15000 }
        },
        {
            play: '+k10',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 20480, enemyValue: -10240 }
        },
        {
            play: '-v',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -800, enemyValue: 400 }
        },
        {
            play: '+2v+4k120*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 16640, enemyValue: -8320 }
        },
        {
            play: '$+v-k80',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 640, enemyValue: 80 }
        },
        {
            play: '+v$-k80',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 640, enemyValue: -400 }
        },
        {
            play: '+v$:-k80',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 720, enemyValue: -400 }
        },
        {
            play: '$:-3v',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -6000, enemyValue: 0 }
        },
        {
            play: '$:-4v*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -24800, enemyValue: 0 }
        },
        {
            play: '$:-2s$:-t100*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -320, enemyValue: 0 }
        },
        {
            play: '$:-2s$:-t110*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -280 - 80, enemyValue: 0 }
        },
        {
            play: '$:-3k70',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -64 * 40 + 160, enemyValue: 0 }
        },
        {
            play: '$:-3k70-s*{tahle sedla!}',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: 'tahle sedla!', ownValue: -128 * 40 - 80 + 320, enemyValue: 40 }
        },
        {
            play: 'e{',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: false, comment: null, ownValue: 0, enemyValue: 0 }
        },
        {
            play: '+k100-n',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 60, enemyValue: -30 }
        },
        {
            play: '-1k100+n*',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -280, enemyValue: 140 }
        },
        {
            play: '+k100-1n',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: false, comment: null, ownValue: 0, enemyValue: 0 }
        },
        {
            play: '-k0',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: -30000, enemyValue: 15000 }
        },
        {
            play: '+3k160',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: null, ownValue: 30000, enemyValue: -15000 }
        },
        {
            play: 'e{ěščřžýáíéúůťóďňĚŠČŘŽÝÁÍÉÚŮŤÓĎŇ}',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: true, comment: 'ěščřžýáíéúůťóďňĚŠČŘŽÝÁÍÉÚŮŤÓĎŇ', ownValue: -120, enemyValue: 60 }
        },
        {
            play: '-h+2s',
            opt: {groupSize: 3, multiplier: 1, hundredType: Hundred.MULTI},
            expected: { accepted: false, comment: null, ownValue: 0, enemyValue: 0 }
        },
        {
            play: 'e',
            opt: {groupSize: 3, multiplier: 2, hundredType: Hundred.ADD},
            expected: { accepted: true, comment: null, ownValue: -240, enemyValue: 120 }
        },
        {
            play: '+k130',
            opt: {groupSize: 3, multiplier: 2, hundredType: Hundred.ADD},
            expected: { accepted: true, comment: null, ownValue: 2 * 40 * 4 * 2, enemyValue: -2 * 40 * 4 }
        },
        {
            play: 'k130+s*',
            opt: {groupSize: 3, multiplier: 2, hundredType: Hundred.ADD},
            expected: { accepted: false, comment: null, ownValue: 0, enemyValue: 0 }
        },
        {
            play: '+c*',
            opt: {groupSize: 3, multiplier: 2, hundredType: Hundred.ADD},
            expected: { accepted: false, comment: null, ownValue: 0, enemyValue: 0 }
        },
    ]

    runTests() {
        const errors = []

        for (const record of this.records) {
            const indexOption = new IndexOption()
            indexOption.hundredType = record.opt.hundredType
            indexOption.multiplier = record.opt.multiplier
            const evaluator = new SimpleEvaluator(record.opt.groupSize, indexOption)
            const result = evaluator.evaluate(record.play)
            const exp = record.expected
            if (result.accepted !== exp.accepted || result.comment !== exp.comment || result.ownValue !== exp.ownValue || result.enemyValue !== exp.enemyValue) {
                record.result = result
                errors.push(record)
            }
        }

        if (errors.length === 0) {
            return
        }

        const strError = '[' + errors.map(function(r) {
            return 'specifikace: ' + r.play + ', očekávané: ' + JSON.stringify(r.expected) + ', výsledek: ' + JSON.stringify(r.result)
        }).join(' ') + ']'

        document.getElementById('error').textContent = 'Chyba testu: ' + strError
    }
}

class TestRecord {
    play = ''
    opt = {
        groupSize: 3,
        hundredType: Hundred.MULTI,
        multiplier: 1,
    }
    expected = {
        accepted: false,
        comment: '',
        ownValue: 0,
        enemyValue: 0,
    }
    result = new Result()
}
