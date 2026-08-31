CREATE TABLE `FloatingAnnouncement` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `content` TEXT NOT NULL,
  `isEnabled` BOOLEAN NOT NULL DEFAULT false,
  `updatedById` VARCHAR(191) NULL,
  `updatedByName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `FloatingAnnouncement` (`id`, `content`, `isEnabled`, `updatedAt`)
VALUES (1, '网站即将进行短暂维护，请及时保存正在填写的内容。', false, CURRENT_TIMESTAMP(3));
