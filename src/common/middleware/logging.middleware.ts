import debug from 'debug'
import {Context} from 'grammy'

const log = debug('bot:logging.middleware')

export async function ResponseTime(
    ctx: Context,
    next: () => Promise<void>,
): Promise<void> {
    const before = Date.now() // milliseconds
    await next() // make sure to `await`!
    const after = Date.now() // milliseconds
    log(`Response time via middleware: ${after - before} ms`)
}