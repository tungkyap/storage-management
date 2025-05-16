// schemas/item.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ItemDocument = Item & Document;

@Schema({ timestamps: true })
export class Item {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, default: 0 })
  quantity: number;

  @Prop()
  location: string;

  @Prop()
  category: string;

  @Prop()
  assignedTo: string;

  @Prop({ default: false })
  isLowStock: boolean;

  @Prop()
  minimumStockLevel: number;

  @Prop()
  imageUrl: string;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop() // New field for Cloudinary publicId
  imagePublicId: string;
}

export const ItemSchema = SchemaFactory.createForClass(Item);
