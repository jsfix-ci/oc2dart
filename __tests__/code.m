CCLOG(@"BeginSave");
    NSArray* path= NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    
    NSString* documentDirectory = [path objectAtIndex:0];
    
    if (!documentDirectory) {
        CCLOGERROR(@"No Document");
        return;
    }
    NSString* dataFile = [documentDirectory stringByAppendingPathComponent:filename];
    NSMutableDictionary* root = [NSMutableDictionary dictionaryWithCapacity:3];
    NSMutableDictionary* units = [NSMutableDictionary dictionaryWithCapacity:400];
    for (InfoComponent* info in unitInfos) {
        [units setObject:info.dictionaryValue forKey:[NSString stringWithFormat:@"Unit%d",info.hero.num.intValue] ];
    }
    [root setObject:units forKey:@"Units"];
    NSData* varData = [NSData dataWithBytes:varArray length:VARARRAY_MAX*sizeof(BOOL)];
    [root setObject:varData forKey:@"VarData"];
    [root setObject:[NSNumber numberWithInt:currentRDrama] forKey:@"CurrentRDrama"];
    [root setObject:[NSNumber numberWithInt:currentSDrama] forKey:@"CurrentSDrama"];
    [root setObject:[NSNumber numberWithInt:nextRDrama] forKey:@"NextRDrama"];
    [root setObject:[NSNumber numberWithInt:nextSDrama] forKey:@"NextSDrama"];
    [root setObject:[NSNumber numberWithInt:chapterIndex] forKey:@"ChapterIndex"];
    if (!eventName) {
        [root setObject:@"无" forKey:@"EventName"];

    }else
        [root setObject:eventName forKey:@"EventName"];
    [root setObject:placeName forKey:@"PlaceName"];
    [root setObject:BGMName forKey:@"BGMName"];

    [root setObject:[[Store sharedStore] dictionaryValue] forKey:@"Store"];
    
    NSMutableArray* BFIndexArray = [NSMutableArray arrayWithCapacity:4];
    for (InfoComponent* info in battlePlayerUnits) {
        [BFIndexArray addObject:info.hero.num];
    }
    [root setObject:BFIndexArray forKey:@"BFIndex"];
    [root setObject:[GameLayer shareGameLayer].gameLayerDictionary forKey:@"GameLayerDic"];
    [root writeToFile:dataFile atomically:YES];
    CCLOG(@"Save OK");