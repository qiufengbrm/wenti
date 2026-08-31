ALTER TABLE `Tutorial`
  ADD COLUMN `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN `publishedAt` DATETIME(3) NULL,
  ADD COLUMN `attachmentStorageKey` VARCHAR(500) NULL,
  ADD COLUMN `attachmentFileName` VARCHAR(191) NULL,
  ADD COLUMN `attachmentFileType` VARCHAR(191) NULL,
  ADD COLUMN `attachmentFileSize` INTEGER NULL;

UPDATE `Tutorial`
SET `publishedAt` = `createdAt`
WHERE `status` = 'PUBLISHED';

ALTER TABLE `Tutorial`
  ALTER COLUMN `status` SET DEFAULT 'DRAFT';
