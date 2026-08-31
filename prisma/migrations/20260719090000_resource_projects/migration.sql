CREATE TABLE `ResourceProject` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ResourceProject_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `ResourceProject` (`id`, `name`, `description`, `createdById`, `createdAt`, `updatedAt`)
SELECT
    'legacy_resource_project',
    '历史资料',
    '资料中心项目化之前已有的文件和文件夹。',
    `User`.`id`,
    COALESCE((SELECT MIN(`createdAt`) FROM `FileResource`), CURRENT_TIMESTAMP(3)),
    CURRENT_TIMESTAMP(3)
FROM `User`
WHERE `role` IN ('SUPER_ADMIN', 'ADMIN')
ORDER BY FIELD(`role`, 'SUPER_ADMIN', 'ADMIN'), `createdAt`
LIMIT 1;

ALTER TABLE `FileResource`
    ADD COLUMN `projectId` VARCHAR(191) NULL;
ALTER TABLE `ResourceFolder`
    ADD COLUMN `projectId` VARCHAR(191) NULL;

UPDATE `FileResource`
SET `projectId` = 'legacy_resource_project'
WHERE EXISTS (SELECT 1 FROM `ResourceProject` WHERE `id` = 'legacy_resource_project');
UPDATE `ResourceFolder`
SET `projectId` = 'legacy_resource_project'
WHERE EXISTS (SELECT 1 FROM `ResourceProject` WHERE `id` = 'legacy_resource_project');

CREATE INDEX `FileResource_projectId_folderId_title_idx` ON `FileResource`(`projectId`, `folderId`, `title`);
CREATE INDEX `ResourceFolder_projectId_parentId_name_idx` ON `ResourceFolder`(`projectId`, `parentId`, `name`);

ALTER TABLE `ResourceProject` ADD CONSTRAINT `ResourceProject_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FileResource` ADD CONSTRAINT `FileResource_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `ResourceProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ResourceFolder` ADD CONSTRAINT `ResourceFolder_projectId_fkey`
    FOREIGN KEY (`projectId`) REFERENCES `ResourceProject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
