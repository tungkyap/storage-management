import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Item, ItemSchema } from '../schemas/item.schema';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { FileEntity, FileSchema } from 'src/schemas/file.schema';
import { FileService } from 'src/file/file.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Item.name, schema: ItemSchema },
      { name: FileEntity.name, schema: FileSchema },
    ]),
  ],
  controllers: [ItemsController],
  providers: [ItemsService, FileService],
})
export class ItemsModule {}
