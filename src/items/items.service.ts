// src/items/items.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Item, ItemDocument } from '../schemas/item.schema';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { FileService } from '../file/file.service';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item.name) private itemModel: Model<ItemDocument>,
    private fileService: FileService,
  ) {}

  async create(
    createItemDto: CreateItemDto,
    file?: Express.Multer.File,
  ): Promise<Item> {
    let imageUrl = createItemDto.imageUrl;
    let imagePublicId = '';
    if (file) {
      const { imageUrl: cloudinaryUrl, publicId } =
        await this.fileService.saveFile(file, false);
      imageUrl = cloudinaryUrl;
      imagePublicId = publicId;
    }

    const isLowStock = this.calculateLowStock(
      createItemDto.quantity,
      createItemDto.minimumStockLevel,
    );

    const createdItem = new this.itemModel({
      ...createItemDto,
      imageUrl,
      imagePublicId,
      isLowStock,
    });
    return createdItem.save();
  }

  async findAll(): Promise<Item[]> {
    return this.itemModel.find().exec();
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemModel.findById(id).exec();
    if (!item) {
      throw new NotFoundException(`Item with ID "${id}" not found`);
    }
    return item;
  }

  async update(
    id: string,
    updateItemDto: UpdateItemDto,
    file?: Express.Multer.File,
  ): Promise<Item> {
    const existingItem = await this.findOne(id);
    let imageUrl = updateItemDto.imageUrl || existingItem.imageUrl;
    let imagePublicId = existingItem.imagePublicId;

    if (file) {
      const { imageUrl: cloudinaryUrl, publicId } =
        await this.fileService.saveFile(file, false);
      imageUrl = cloudinaryUrl;
      imagePublicId = publicId;
      if (existingItem.imagePublicId) {
        await this.deleteCloudinaryImage(existingItem.imagePublicId);
      }
    }

    const isLowStock = this.calculateLowStock(
      updateItemDto.quantity ?? existingItem.quantity,
      updateItemDto.minimumStockLevel ?? existingItem.minimumStockLevel,
    );

    const updatedItem = await this.itemModel
      .findByIdAndUpdate(
        id,
        { ...updateItemDto, imageUrl, imagePublicId, isLowStock },
        { new: true },
      )
      .exec();
    if (!updatedItem) {
      throw new NotFoundException(`Item with ID "${id}" not found`);
    }
    return updatedItem;
  }

  async remove(id: string): Promise<Item> {
    const item = await this.findOne(id);
    if (item.imagePublicId) {
      // console.log(
      //   `Deleting Cloudinary image for item ${id} with publicId: ${item.imagePublicId}`,
      // );
      await this.deleteCloudinaryImage(item.imagePublicId);
    } else if (item.imageUrl) {
      // console.log(
      //   `No imagePublicId for item ${id}, attempting to extract from imageUrl: ${item.imageUrl}`,
      // );
      const urlParts = item.imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      const publicId = fileName.split('.')[0];
      await this.deleteCloudinaryImage(publicId); // Try without folder prefix
    } else {
      // console.log(`No imagePublicId or imageUrl found for item ${id}`);
    }

    const deletedItem = await this.itemModel.findByIdAndDelete(id).exec();
    if (!deletedItem) {
      throw new NotFoundException(`Item with ID "${id}" not found`);
    }
    return deletedItem;
  }

  async findByCategory(category: string): Promise<Item[]> {
    return this.itemModel.find({ category }).exec();
  }

  async findLowStock(): Promise<Item[]> {
    return this.itemModel.aggregate([
      {
        $addFields: {
          isLowStock: {
            $cond: {
              if: {
                $and: [
                  { $gt: ['$minimumStockLevel', 0] },
                  { $lte: ['$quantity', '$minimumStockLevel'] },
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $match: { isLowStock: true },
      },
    ]);
  }

  async getSummary() {
    const totalItems = await this.itemModel.countDocuments();
    const totalStockAgg = await this.itemModel.aggregate([
      { $group: { _id: null, total: { $sum: '$quantity' } } },
    ]);
    const totalStock = totalStockAgg[0]?.total || 0;

    const lowStockCount = await this.itemModel.countDocuments({
      $expr: { $lte: ['$quantity', '$minimumStockLevel'] },
    });

    const latestItem = await this.itemModel.findOne().sort({ updatedAt: -1 });

    return {
      totalItems,
      totalStock,
      lowStockCount,
      lastUpdated: latestItem?.updatedAt || new Date(),
    };
  }

  private calculateLowStock(
    quantity: number,
    minimumStockLevel?: number,
  ): boolean {
    return minimumStockLevel !== undefined && quantity <= minimumStockLevel;
  }

  private async deleteCloudinaryImage(imagePublicId: string): Promise<void> {
    try {
      // console.log(
      //   `Attempting to delete Cloudinary image with publicId: ${imagePublicId}`,
      // );
      const result = await cloudinary.uploader.destroy(imagePublicId);
      // console.log(`Cloudinary delete result:`, result);
      if (result.result !== 'ok') {
        console.warn(`Cloudinary deletion failed: ${result.result}`);
      }
    } catch (error) {
      console.error('Error deleting Cloudinary image:', error);
    }
  }
}
