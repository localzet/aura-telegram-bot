import {Injectable, OnModuleInit} from "@nestjs/common";

import {PrismaClient} from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    public async onModuleInit() {
        return await this.$connect();
    }
}