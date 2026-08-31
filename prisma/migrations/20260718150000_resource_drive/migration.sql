CREATE TABLE `ResourceFolder` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `visibility` ENUM('ALL', 'ADMINS', 'VOLUNTEERS') NOT NULL DEFAULT 'ALL',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ResourceFolder_parentId_name_idx`(`parentId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FileResource`
    MODIFY `fileUrl` VARCHAR(191) NULL,
    ADD COLUMN `folderId` VARCHAR(191) NULL,
    ADD COLUMN `storageKey` VARCHAR(191) NULL,
    ADD COLUMN `previewKey` VARCHAR(191) NULL,
    ADD COLUMN `previewStatus` ENUM('NONE', 'PENDING', 'READY', 'FAILED') NOT NULL DEFAULT 'NONE';

UPDATE `FileResource` SET `visibility` = 'ADMINS' WHERE `visibility` = 'PRIVATE';

CREATE UNIQUE INDEX `FileResource_storageKey_key` ON `FileResource`(`storageKey`);
CREATE INDEX `FileResource_folderId_title_idx` ON `FileResource`(`folderId`, `title`);

ALTER TABLE `ResourceFolder` ADD CONSTRAINT `ResourceFolder_parentId_fkey`
    FOREIGN KEY (`parentId`) REFERENCES `ResourceFolder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ResourceFolder` ADD CONSTRAINT `ResourceFolder_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FileResource` ADD CONSTRAINT `FileResource_folderId_fkey`
    FOREIGN KEY (`folderId`) REFERENCES `ResourceFolder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
