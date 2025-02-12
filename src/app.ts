import * as restate from "@restatedev/restate-sdk";

const counter = restate.object({
    name: "Counter",
    handlers: {
        count: async (ctx: restate.ObjectContext) => {
            let counter = await ctx.get<number>("counter") ?? 0;
            counter++;
            ctx.set("counter", counter);
            return counter;
        },
        clear: async (ctx: restate.ObjectContext) => {
            ctx.clearAll()
        }
    }
});

export type Counter = typeof counter

restate
    .endpoint()
    .bind(counter)
    .listen(9080);
