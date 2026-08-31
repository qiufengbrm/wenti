ALTER TABLE `Task`
  ADD COLUMN `startClockTime` VARCHAR(5) NULL,
  ADD COLUMN `endClockTime` VARCHAR(5) NULL;

UPDATE `Task`
SET `startClockTime` = DATE_FORMAT(`startTime`, '%H:%i')
WHERE `startTime` IS NOT NULL;

UPDATE `Task`
SET `endClockTime` = DATE_FORMAT(`endTime`, '%H:%i')
WHERE `endTime` IS NOT NULL;

ALTER TABLE `VolunteerHour`
  ADD COLUMN `serviceStartClockTime` VARCHAR(5) NULL,
  ADD COLUMN `serviceEndClockTime` VARCHAR(5) NULL;

UPDATE `VolunteerHour`
SET `serviceStartClockTime` = DATE_FORMAT(`serviceStartAt`, '%H:%i')
WHERE `serviceStartAt` IS NOT NULL;

UPDATE `VolunteerHour`
SET `serviceEndClockTime` = DATE_FORMAT(`serviceEndAt`, '%H:%i')
WHERE `serviceEndAt` IS NOT NULL;
