import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Get,
  Param,
  UseGuards,
  Redirect,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileService } from './file.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}
  // Single file upload
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
        ];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Files format are not allowed'),
            false,
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { file: savedFile, imageUrl } = await this.fileService.saveFile(
      file,
      true,
    ); // Save metadata if needed
    return { file: savedFile, imageUrl };
  }

  // Multiple file upload
  @Post('uploads')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      // Allow up to 10 files
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
    }),
  )
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results = [];
    for (const file of files) {
      results.push(await this.fileService.saveFile(file));
    }

    return results;
  }

  // Serve uploaded files
  @Get(':filename')
  @Redirect()
  async getFile(@Param('filename') filename: string) {
    // Assuming filename is the Cloudinary public_id or URL stored in path
    const file = this.fileService.getFileByName(filename);
    if (!file) {
      throw new BadRequestException('File not found');
    }
    return { url: file['path'] }; // Redirect to Cloudinary URL
  }
}
