CREATE TABLE `VolunteerSchedule` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `academicTerm` VARCHAR(191) NOT NULL,
    `className` VARCHAR(191) NULL,
    `major` VARCHAR(191) NULL,
    `department` VARCHAR(191) NULL,
    `sourceFileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VolunteerSchedule_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ScheduleCourse` (
    `id` VARCHAR(191) NOT NULL,
    `scheduleId` VARCHAR(191) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startTime` VARCHAR(5) NOT NULL,
    `endTime` VARCHAR(5) NOT NULL,
    `courseName` VARCHAR(191) NOT NULL,
    `details` TEXT NOT NULL,
    `weeks` TEXT NOT NULL,
    `originalText` TEXT NOT NULL,

    INDEX `ScheduleCourse_dayOfWeek_startTime_endTime_idx`(`dayOfWeek`, `startTime`, `endTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `VolunteerSchedule` ADD CONSTRAINT `VolunteerSchedule_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `ScheduleCourse` ADD CONSTRAINT `ScheduleCourse_scheduleId_fkey` FOREIGN KEY (`scheduleId`) REFERENCES `VolunteerSchedule`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
