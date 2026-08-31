ALTER TABLE `Tutorial`
  ADD COLUMN `contentFormat` VARCHAR(20) NOT NULL DEFAULT 'PLAIN';

CREATE TABLE `TutorialInlineImage` (
  `id` VARCHAR(191) NOT NULL,
  `tutorialId` VARCHAR(191) NULL,
  `storageKey` VARCHAR(500) NOT NULL,
  `uploadedById` VARCHAR(191) NOT NULL,
  `fileName` VARCHAR(191) NOT NULL,
  `fileSize` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `TutorialInlineImage_storageKey_key`(`storageKey`),
  INDEX `TutorialInlineImage_tutorialId_idx`(`tutorialId`),
  INDEX `TutorialInlineImage_uploadedById_createdAt_idx`(`uploadedById`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `TutorialInlineImage`
  ADD CONSTRAINT `TutorialInlineImage_tutorialId_fkey`
  FOREIGN KEY (`tutorialId`) REFERENCES `Tutorial`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
