import { strict as assert } from 'assert';

function intValue(line: string): string {
  return line.replace('.intValue', '.toInt()');
}

function _stringWithFormat(line: string): string {
  // https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/Strings/Articles/formatSpecifiers.html
  const r = /\[NSString\s+stringWithFormat:@"([^"]+)",([^\]]+)\]/.exec(line);
  let str: string = '';
  if (r !== null) {
    const format = r[1];
    const argsStr = r[2];
    const args = argsStr.split(',');
    const r2 = /(%[a-zA-Z@])/.exec(format);
    if (r2 !== null) {
      str = r2.input;
      const len = r2.length;
      for (let index = 0; index < len; index++) {
        str = str.replace(r2[index + 1], `\${${args[index]}}`);
      }
    }
  } else {
    return line;
  }
  return line.replace(r[0], `"${str}"`);
}

function stringWithFormat(line: string): string {
  const funcs: any[] = [intValue, _stringWithFormat];
  // @ts-ignore
  return funcs.reduce((p, func) => func(p), line);
}

function numberWithInt(line: string): string {
  const r = /\[NSNumber\s+numberWithInt:([^\]]+)\]/;
  if (r.test(line)) {
    const r2 = r.exec(line);
    if (r2 !== null) {
      const result = line.replace(r2[0], `(${r2[1]} as num)`);
      return result;
    }
  }
  return line;
}

function _setObject(line: string): string {
  return line.replace(
    /\[\s*(\w+)\s+setObject:([^\]]+)\s+forKey:"([^\]]+)"\s*\]/,
    `$1['$3'] = $2`
  );
}

function asString(line: string): string {
  return line.replace(/@"([^"]+)"/g, `"$1"`);
}

function setObject(line: string): string {
  const funcs: any[] = [numberWithInt, stringWithFormat, asString, _setObject];
  // @ts-ignore
  return funcs.reduce((p, func) => func(p), line);
}

// @ts-ignore
function _methodCall(line: string): string {
  const r = /\[\s*([^\]]+)\s+([^\]]+)\s*\]/;
  let result = line;
  while (r.exec(result)) {
    result = result.replace(r, `$1.$2()`);
  }
  return result;
}

function _simpleMethodCall(line: string): string {
  // obj.met
  const r = /\[\s*([\w\.\(\)]+)\s+([\w\.\(\)]+)\s*\]/;
  let result = line;
  // tslint:disable-next-line: no-conditional-assignment
  while (r.exec(result)) {
    result = result.replace(r, `$1.$2()`);
  }
  return result;
}

function _callWithArgs(line: string): string {
  // obj.met args
  const r = /\[\s*([\w\.\(\)]+)\s([\w\.\(\)]+)\s*([\w:\s\.\(\)]+)?\]/;
  let result = line;
  let a;
  // tslint:disable-next-line: no-conditional-assignment
  while ((a = r.exec(result))) {
    if (a.length === 4) {
      if (a[3]) {
        const s3A = a[3].split(' ');
        for (let index = 0; index < s3A.length; index++) {
          s3A[index] = s3A[index].replace(/^:/, '');
        }
        const s3 = s3A.join(',');
        result = result.replace(r, `$1.$2(${s3})`);
      } else {
        result = result.replace(r, `$1.$2()`);
      }
    } else {
      result = result.replace(r, `$1.$2()`);
    }
  }
  return result;
}

function _replaceTypes(line: string): string {
  const R = /([A-Z]\w+)\s*\*\s*(\w+)/g;
  return line.replace(R, '$1 $2');
}

const BuiltinTypes = {
  '(?:\\b)int': `int`,
  '(?:\\b)NSString\\s*\\*?\\s*': 'String ',
  '(?:\\b)BOOL': 'bool',
  '(?:\\b)void': 'void',
  '(?:\\b)float': 'double',
  '(?:\\b)nil': 'null',
  '(?:\\b)NSMutableString\\s*\\*?\\s*': 'String ',
  '(?:\\b)id\\s+(\\w+)': 'dynamic $1',
  '(?:\\b)NSNumber\\s*\\*?\\s*': 'num ',
  '(?:\\b)NSArray\\s*\\*?\\s*': `List<dynamic> `,
  '(?:\\b)NSMutableArray\\s*\\*?\\s*': `List<dynamic> `,
  '(?:\\b)NSDictionary\\s*\\*?\\s*': `Map `,
  '(?:\\b)NSMutableDictionary\\s*\\*?\\s*': `Map `,
};

function replaceBuiltinTypes(line: string): string {
  return Object.entries(BuiltinTypes).reduce((p, [k, v], _) => {
    const R = new RegExp(k, 'g');
    return p.replace(R, v);
  }, line);
}

function dictionaryWithCapacity(line: string): string {
  const r = /\[\s*NSMutableDictionary\s+dictionaryWithCapacity:(\d+)\s*\];?/;
  return line.replace(r, '{}; // capacity:$1');
}

function arrayWithCapacity(line: string): string {
  const r = /\[\s*NSMutableArray\s+arrayWithCapacity:(\d+)\s*\];?/g;
  return line.replace(r, '[]; // capacity:$1');
}

function array_addObject(line: string): string {
  const r = /\[\s*([^\]]+)\s+addObject:([^\]]+)\s*\]/;
  return line.replace(r, '$1.add($2)');
}

function array_objectAtIndex(line: string): string {
  const r = /\[\s*([^\]]+)\s+objectAtIndex:([^\]]+)\s*\]/;
  return line.replace(r, '$1[$2]');
}

function dict_forKey(line: string): string {
  // take NSDictionary value or object by key
  const r = /\[\s*([^\]:]+)\s+forKey:([^\]]+)\s*\]/;
  const r2 = /\[\s*([^\]:]+)\s+objectForKey:([^\]]+)\s*\]/;
  return line.replace(r, '$1[$2]').replace(r2, '$1[$2]');
}

function replaceYesNo(line: string): string {
  return line.replace('YES', 'true').replace('NO', 'false');
}

function replaceDefine(line: string): string {
  // #define BUFFER_SIZE 1024
  const r = /^#define\s+([\S]+)\s+(.*)/;
  return line.replace(r, 'const $1 = $2;');
}

function array_replaceObjectAtIndex(line: string): string {
  const r = /\[\s*([^\]]+)\s+replaceObjectAtIndex:([^\]]+)\s+withObject:(.*)\s*\]/;
  return line.replace(r, '$1[$2] = $3');
}

// high priority
function enumerateKeysAndObjectsUsingBlock(line: string): string {
  const start = /\[(\w+)\s+enumerateKeysAndObjectsUsingBlock:\^\(\w+\s+(\w+),\s+\w+\s+(\w+),\s+\w+\s+[\w\*](\w+)\)\s*\{.*/;
  const end = /^\s*\}\s*\]\s*;$/m;
  return line.replace(start, '$1.forEach(($2, $3) {').replace(end, '}');
}

function replace_autorelease(line: string): string {
  // replace to class factory call
  const r = /\[\[\[([A-Z]\w+)\s+alloc\s*\]\s+init\]\s+autorelease\]/
  return line.replace(r, '$1()')
}

function replace_sort(line: string): string {
  const start = /\[(\w+)\s+sortUsingComparator:\^NSComparisonResult\(\w+\s+(\w+),\s+\w+\s+(\w+)\)\s*\{.*/;
  const end = /^\s*\}\s*\]\s*;$/m;
  const note = `
  // could be $1.sort(($2, $3) => $2.compareTo($3));
  `
  return line.replace(start, `$1.sort(($2, $3) {${note}`).replace(end, '}');
}

function remove_alloc(line: string): string {
  const r = /\[[A-Z]\w+\s+alloc\]/;
  return line.replace(r, '');
}

// @ts-ignore
function remove_release(line: string): string {
  const r = /\[\w+\s+release\]/;
  return line.replace(r, '');
}

// @ts-ignore
function remove_dealloc(line: string): string {
  const r = /\[\w+\s+dealloc\]/;
  return line.replace(r, '');
}

function _initWithDictionary(line: string): string {
  const r = /\[\s*initWithDictionary:(.*)\s+copyItems:(.*)\]/;
  return line.replace(r, '$1');
}

// high priority
function initWithDictionary(line: string): string {
  // `terrainMoveDic = [[NSDictionary alloc] initWithDictionary:[root objectForKey:@"Move"] copyItems:YES];`
  const funcs: any[] = [remove_alloc, _initWithDictionary];
  // @ts-ignore
  return funcs.reduce((p, func) => func(p), line);
}

export function transform(line: string): string {
  const funcs: any[] = [
    replace_sort,
    enumerateKeysAndObjectsUsingBlock,
    replace_autorelease,
    initWithDictionary,
    arrayWithCapacity,
    array_addObject,
    array_replaceObjectAtIndex,
    array_objectAtIndex,
    dictionaryWithCapacity,
    dict_forKey,
    _simpleMethodCall,
    setObject,
    numberWithInt,
    stringWithFormat,
    asString,
    _callWithArgs,
    replaceBuiltinTypes,
    _replaceTypes,
    replaceYesNo,
    // remove_release,
    // remove_dealloc
  ];
  // @ts-ignore
  return funcs.reduce((p, func) => func(p), line);
}

const s1 = `[NSString stringWithFormat:@"Unit%d",info.hero.num.intValue]`;
// tslint:disable-next-line: no-invalid-template-strings
assert(stringWithFormat(s1) === '"Unit${info.hero.num.toInt()}"');

const s2 = `[NSNumber numberWithInt:currentSDrama]`;
assert(numberWithInt(s2) === `(currentSDrama as num)`);

const s3 = `[root setObject:[NSNumber  numberWithInt:currentSDrama] forKey:@"CurrentSDrama"];`;
// [root setObject:(currentSDrama as num) forKey:@"CurrentSDrama"];
assert(setObject(s3) === `root['CurrentSDrama'] = (currentSDrama as num);`);

const s4 = `[units setObject:info.dictionaryValue forKey:[NSString stringWithFormat:@"Unit%d",info.hero.num.intValue] ];`;
// [units setObject:info.dictionaryValue forKey:"Unit${info.hero.num.toInt()}" ];
// tslint:disable-next-line: no-invalid-template-strings
assert(
  setObject(s4) ===
  "units['Unit${info.hero.num.toInt()}'] = info.dictionaryValue;"
);

// tslint:disable-next-line: no-invalid-template-strings
assert(
  transform(s4) ===
  "units['Unit${info.hero.num.toInt()}'] = info.dictionaryValue;"
);

const s5 = `[root setObject:[[Store sharedStore] dictionaryValue] forKey:"Store"];`;
assert(
  transform(s5) === `root['Store'] = Store.sharedStore().dictionaryValue();`
);

assert(
  transform(`[root setObject:@"无" forKey:@"EventName"];`) ===
  `root['EventName'] = "无";`
);
assert(
  transform(`[root writeToFile:dataFile atomically:YES];`) ===
  `root.writeToFile(dataFile,atomically:true);`
);

const s6 = `NSMutableArray* BFIndexArray = [NSMutableArray arrayWithCapacity:4];`;
assert(
  _replaceTypes(s6) ===
  `NSMutableArray BFIndexArray = [NSMutableArray arrayWithCapacity:4];`
);

const s7 = `NSString* documentDirectory = [path objectAtIndex:0];`;
assert(
  replaceBuiltinTypes(s7) ===
  `String documentDirectory = [path objectAtIndex:0];`
);

const s8 = `[NSMutableDictionary dictionaryWithCapacity:400];`;
assert(dictionaryWithCapacity(s8) === `{}; // capacity:400`);

const s9 = `[NSMutableArray arrayWithCapacity:4];`;
assert(arrayWithCapacity(s9) === `[]; // capacity:4`);

const s10 = `[BFIndexArray addObject:info.hero.num];`;
assert(array_addObject(s10) === `BFIndexArray.add(info.hero.num);`);

const s11 = `NSString* documentDirectory = [path objectAtIndex:0];`;
assert(array_objectAtIndex(s11) === `NSString* documentDirectory = path[0];`);

const s12 = `[path forKey:@"1"];`;
assert(dict_forKey(s12) === `path[@"1"];`);

const s13 = `#define BUFFER_SIZE 1024`;
assert(replaceDefine(s13) === `const BUFFER_SIZE = 1024;`);

const s14 = `id data = name;`;
assert(transform(s14) === `dynamic data = name;`);

const s15 = `return nil;`;
assert(transform(s15) === `return null;`);

const s16 = `[result replaceObjectAtIndex:magicTypeNum.intValue withObject:[terrainsValue objectAtIndex:num]];`;

assert(transform(s16) === `result[magicTypeNum.toInt()] = terrainsValue[num];`);

const s17 = `
[terrainMagicsDic enumerateKeysAndObjectsUsingBlock:^(id key, id obj, BOOL *stop) {
  NSString* magicTypeNum = key;
  
  NSArray* terrainsValue = obj;
  [result replaceObjectAtIndex:magicTypeNum.intValue withObject:[terrainsValue objectAtIndex:num]];
}];
`;
const r17 = `
terrainMagicsDic.forEach((key, obj) {
  String magicTypeNum = key;
  
  List<dynamic> terrainsValue = obj;
  result[magicTypeNum.toInt()] = terrainsValue[num];
}
`;
assert(transform(s17) === r17);

assert(
  dict_forKey(`sundry.numIcon = [obj objectForKey:@"NumIcon"];`) ===
  `sundry.numIcon = obj[@"NumIcon"];`
);

const s18 = `terrainMoveDic = [[NSDictionary alloc] initWithDictionary:[root objectForKey:@"Move"] copyItems:YES];`;
assert(
  initWithDictionary(s18) === `terrainMoveDic = [root objectForKey:@"Move"];`
);
assert(transform(s18) === `terrainMoveDic = root["Move"];`);

const s19 = `Hero *hero = [[[Hero alloc] init] autorelease];`
assert(transform(s19) === `Hero hero = Hero();`)

const s20 = `
[heros sortUsingComparator:^NSComparisonResult(id obj1, id obj2) {
  Hero* s1 = obj1;
  Hero* s2 = obj2;
  if (s1.num.intValue>s2.num.intValue) {
      return YES;
  }
  return NO;
}];
`

const r20 =`
heros.sort((obj1, obj2) {
  // could be heros.sort((obj1, obj2) => obj1.compareTo(obj2));
  
  Hero s1 = obj1;
  Hero s2 = obj2;
  if (s1.num.toInt()>s2.num.toInt()) {
      return true;
  }
  return false;
}
`
assert(transform(s20) === r20)