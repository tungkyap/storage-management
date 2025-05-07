import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileEntity, FileDocument } from '../schemas/file.schema';

@Injectable()
export class FileService {
  constructor(
    @InjectModel(FileEntity.name) private fileModel: Model<FileDocument>,
  ) {}
  async saveFile(file: Express.Multer.File) {
    // You can add custom logic here, like:
    // - Checking file type
    // - Generating unique file names
    // - Saving metadata to database
    // - Image processing, etc.

    const newFile = new this.fileModel({
      originalname: file.originalname,
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    });

    await newFile.save();
    return newFile;
  }

  async getFiles() {
    return this.fileModel.find().exec();
  }

  async getFileById(id: string) {
    return this.fileModel.findById(id).exec();
  }
}
