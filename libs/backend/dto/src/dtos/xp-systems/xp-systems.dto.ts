import { ApiProperty, PickType } from '@nestjs/swagger';
import { NestedProperty } from '../../decorators';
import { IsArray, IsDefined, IsNumber } from 'class-validator';

// Could implement RankXpParams and CosXpParams in xp-systems.interface.ts but class-validator requires
// we give it this wacky structure.

class CosXpTierScale {
  @ApiProperty()
  @IsNumber()
  readonly linear: number;

  @ApiProperty()
  @IsNumber()
  readonly staged: number;

  @ApiProperty()
  @IsNumber()
  readonly stages: number;

  @ApiProperty()
  @IsNumber()
  readonly bonus: number;
}

class CosXpUniqueTierScale extends PickType(CosXpTierScale, [
  'linear',
  'staged'
] as const) {}
class CosXpRepeatTierScale extends CosXpTierScale {}
class CosXpUnique {
  @NestedProperty(CosXpUniqueTierScale)
  @IsDefined()
  readonly tierScale: CosXpUniqueTierScale;
}
class CosXpRepeat {
  @NestedProperty(CosXpRepeatTierScale)
  @IsDefined()
  readonly tierScale: CosXpRepeatTierScale;
}

class CosXpCompletions {
  @NestedProperty(CosXpUnique)
  @IsDefined()
  readonly unique: CosXpUnique;

  @NestedProperty(CosXpRepeat)
  @IsDefined()
  readonly repeat: CosXpRepeat;
}
class CosXpLevels {
  @ApiProperty()
  @IsNumber()
  readonly maxLevels: number;

  @ApiProperty()
  @IsNumber()
  readonly startingValue: number;

  @ApiProperty()
  @IsNumber()
  readonly linearScaleBaseIncrease: number;

  @ApiProperty()
  @IsNumber()
  readonly linearScaleInterval: number;

  @ApiProperty()
  @IsNumber()
  readonly linearScaleIntervalMultiplier: number;

  @ApiProperty()
  @IsNumber()
  readonly staticScaleStart: number;

  @ApiProperty()
  @IsNumber()
  readonly staticScaleBaseMultiplier: number;

  @ApiProperty()
  @IsNumber()
  readonly staticScaleInterval: number;

  @ApiProperty()
  @IsNumber()
  readonly staticScaleIntervalMultiplier: number;
}

class CosXpDto {
  @NestedProperty(CosXpCompletions)
  @IsDefined()
  readonly completions: CosXpCompletions;

  @NestedProperty(CosXpLevels)
  @IsDefined()
  readonly levels: CosXpLevels;
}

class RankXpFormula {
  @ApiProperty()
  @IsNumber()
  readonly A: number;

  @ApiProperty()
  @IsNumber()
  readonly B: number;
}

class RankXpGroups {
  @ApiProperty()
  @IsNumber()
  readonly maxGroups: number;

  @ApiProperty({ type: Number, isArray: true, minLength: 4, maxLength: 4 })
  @IsNumber({}, { each: true })
  @IsArray()
  readonly groupScaleFactors: number[];

  @ApiProperty({ type: Number, isArray: true, minLength: 4, maxLength: 4 })
  @IsNumber({}, { each: true })
  @IsArray()
  readonly groupExponents: number[];

  @ApiProperty({ type: Number, isArray: true, minLength: 4, maxLength: 4 })
  @IsNumber({}, { each: true })
  @IsArray()
  readonly groupMinSizes: number[];

  @ApiProperty({
    type: Number,
    isArray: true,
    minLength: 4,
    maxLength: 4
  })
  @IsNumber({}, { each: true })
  @IsArray()
  readonly groupPointPcts: number[];
}

class RankXpTop10 {
  @ApiProperty()
  @IsNumber()
  readonly WRPoints: number;

  @ApiProperty({
    type: Number,
    isArray: true,
    minLength: 10,
    maxLength: 10
  })
  @IsNumber({}, { each: true })
  @IsArray()
  readonly rankPercentages: number[];
}

class RankXpDto {
  @NestedProperty(RankXpFormula)
  @IsDefined()
  readonly formula: RankXpFormula;

  @NestedProperty(RankXpGroups)
  @IsDefined()
  readonly groups: RankXpGroups;

  @NestedProperty(RankXpTop10)
  @IsDefined()
  readonly top10: RankXpTop10;
}

export class XpSystemsDto {
  @IsDefined()
  @NestedProperty(RankXpDto)
  @IsDefined()
  readonly rankXP: RankXpDto;

  @IsDefined()
  @NestedProperty(CosXpDto)
  @IsDefined()
  readonly cosXP: CosXpDto;
}

export class UpdateXpSystemsDto extends PickType(XpSystemsDto, [
  'cosXP',
  'rankXP'
] as const) {}
