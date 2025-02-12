import * as restate from "@restatedev/restate-sdk-clients";
import {Opts} from "@restatedev/restate-sdk-clients";
import { Counter } from "./app";
import { setTimeout } from "node:timers/promises";
import {randomUUID} from "node:crypto";
import chalk from "chalk";

const counter: Counter = {name: "Counter"}

const RESTATE_NODES = [
    {url: "http://localhost:8080", name: "node1"},
    {url: "http://localhost:28080", name: "node2"},
    {url: "http://localhost:38080", name: "node3"},
]

const INIT_NODE = +process.env.KEY!
const COUNTER_INDEX = (+process.env.KEY! + 1).toString()
const IDEMPOTENCY_KEY_PREFIX = randomUUID().toString();

async function scheduleCalls() {
    console.info(`Starting calls to counter-${COUNTER_INDEX} and node ${RESTATE_NODES[INIT_NODE].url}`)
    let rs;
    for (let j = INIT_NODE; j < 3; j++) {
        try {
            rs = restate.connect({ url: RESTATE_NODES[j].url });
            await rs
                .objectClient(counter, COUNTER_INDEX)
                .clear();
            console.info(`✅ startup cleanup`)
            break; // Exit the loop if the request is successful
        } catch (e) {
            if (e instanceof Error && e.message.includes('fetch failed')) {
                console.error(`❌ startup cleanup failed on node ${chalk.red(chalk.strikethrough(RESTATE_NODES[j].name))}`);
            } else {
                throw e;
            }
            await setTimeout(100);
        }
        if (j == 2) {
            // loop around
            j = -1;
        }
    }


    for (let i = 1; i < 1000; i++) {
        let count;

        for (let j = INIT_NODE; j < 3; j++) {
            try {
                rs = restate.connect({ url: RESTATE_NODES[j].url });
                count = await rs
                    .objectClient(counter, COUNTER_INDEX)
                    .count(
                        Opts.from({idempotencyKey: IDEMPOTENCY_KEY_PREFIX + i})
                    );

                if (count == i){
                    console.info(`✅ [#${i}] ${RESTATE_NODES[j].name}: counter[${COUNTER_INDEX}]++ = ${count}`);
                } else {
                    throw new Error(`❌ [#${i}] ${RESTATE_NODES[j].name}: expected ${i} but got ${count}`);
                }
                break; // Exit the loop if the request is successful
            } catch (e) {
                if (e instanceof Error && e.message.includes('fetch failed')) {
                    console.error(`❌ [#${i}] 💥 ${chalk.red(chalk.strikethrough(RESTATE_NODES[j].name))}`);
                } else {
                    throw e;
                }
                await setTimeout(100);
            }
            if (j == 2) {
                // loop around
                j = -1;
            }
        }

        await setTimeout(1000);
    }
}

scheduleCalls();
