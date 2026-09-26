CREATE TABLE `AiProviderSetting` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `provider` VARCHAR(32) NOT NULL DEFAULT 'glm',
  `encryptedApiKey` TEXT NOT NULL,
  `encryptionIv` VARCHAR(64) NOT NULL,
  `authTag` VARCHAR(64) NOT NULL,
  `keyHint` VARCHAR(32) NOT NULL,
  `updatedById` VARCHAR(191) NULL,
  `updatedByName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
