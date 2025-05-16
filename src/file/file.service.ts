// src/file/file.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileEntity, FileDocument } from '../schemas/file.schema';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import * as streamifier from 'streamifier';

interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
}

@Injectable()
export class FileService {
  constructor(
    @InjectModel(FileEntity.name) private fileModel: Model<FileDocument>,
    private configService: ConfigService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async saveFile(
    file: Express.Multer.File,
    saveMetadata: boolean = false,
  ): Promise<{
    file: FileDocument | null;
    imageUrl: string;
    publicId: string;
  }> {
    const uploadResult = await this.uploadToCloudinary(file);
    let savedFile: FileDocument | null = null;
    if (saveMetadata) {
      const newFile = new this.fileModel({
        originalname: file.originalname,
        filename: uploadResult.public_id,
        path: uploadResult.secure_url,
        mimetype: file.mimetype,
        size: file.size,
      });
      savedFile = await newFile.save();
    }
    return {
      file: savedFile,
      imageUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
    };
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
  ): Promise<CloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          upload_preset: this.configService.get<string>(
            'CLOUDINARY_UPLOAD_PRESET',
          ),
          resource_type: 'image',
          folder: 'inventory_images', // Ensure folder is set
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result as CloudinaryResponse);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async getFiles() {
    return this.fileModel.find().exec();
  }

  async getFileById(id: string) {
    return this.fileModel.findById(id).exec();
  }

  async getFileByName(filename: string) {
    return this.fileModel.findOne({ filename }).exec();
  }
}
