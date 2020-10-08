// @ts-ignore
import { assert } from "console";

function intValue(line: string): string {
    return line.replace(".intValue", ".toInt()");
}

function _stringWithFormat(line: string): string {
    // https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/Strings/Articles/formatSpecifiers.html
    const r = /\[NSString\s+stringWithFormat:@"([^"]+)",([^\]]+)\]/.exec(line);
    let str: string = "";
    if (r !== null) {
        const format = r[1];
        const argsStr = r[2];
        const args = argsStr.split(",");
        const r2 = /(%[a-zA-Z@])/.exec(format);
        if (r2 !== null) {
            str = r2.input;
            const len = r2.length;
            for (let index = 0; index < len; index++) {
                str = str.replace(r2[index + 1], `\${${args[index]}}`)
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
    const r = /\[NSNumber\s+numberWithInt:([^\]]+)\]/
    if (r.test(line)) {
        const r2 = r.exec(line);
        if (r2 !== null) {
            const result = line.replace(r2[0], `(${r2[1]} as num)`)
            return result;
        }

    }
    return line;

}

function _setObject(line: string): string {
    return line.replace(/\[\s*(\w+)\s+setObject:([^\]]+)\s+forKey:"([^\]]+)"\s*\]/, `$1['$3'] = $2`);
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
    const r = /\[\s*([^\]]+)\s([^\]]+)\s*\]/
    let result = line;
    while (r.exec(result)) {
        result = result.replace(r, `$1.$2()`)
    }
    return result;
}

function _simpleMethodCall(line: string): string {
    // obj.met
    const r = /\[\s*([\w\.\(\)]+)\s([\w\.\(\)]+)\s*\]/
    let result = line;
    // tslint:disable-next-line: no-conditional-assignment
    while ( r.exec(result)) {

            result = result.replace(r, `$1.$2()`)
      

    }
    return result;
}

function _callWithArgs(line: string): string {
    // obj.met args
    const r = /\[\s*([\w\.\(\)]+)\s([\w\.\(\)]+)\s*([\w:\s\.\(\)]+)?\]/
    let result = line;
    let a;
    // tslint:disable-next-line: no-conditional-assignment
    while (a = r.exec(result)) {

        if (a.length === 4) {
            if (a[3]) {
                const s3 = a[3].split(" ").join(",");
                result = result.replace(r, `$1.$2(${s3})`).replace("(:", "(")
            } else {
                result = result.replace(r, `$1.$2()`).replace("(:", "(")
            }

        } else {
            result = result.replace(r, `$1.$2()`).replace("(:", "(")
        }

    }
    return result;
}

export function transform(line: string): string {
    const funcs: any[] = [_simpleMethodCall, setObject, numberWithInt, stringWithFormat, asString,_callWithArgs];
    // @ts-ignore
    return funcs.reduce((p, func) => func(p), line);
}

const s1 = `[NSString stringWithFormat:@"Unit%d",info.hero.num.intValue]`;
// tslint:disable-next-line: no-invalid-template-strings
assert(stringWithFormat(s1) === '"Unit${info.hero.num.toInt()}"');

const s2 = `[NSNumber numberWithInt:currentSDrama]`;
assert(numberWithInt(s2) === `(currentSDrama as num)`)

const s3 = `[root setObject:[NSNumber  numberWithInt:currentSDrama] forKey:@"CurrentSDrama"];`
// [root setObject:(currentSDrama as num) forKey:@"CurrentSDrama"];
assert(setObject(s3) === `root['CurrentSDrama'] = (currentSDrama as num);`);

const s4 = `[units setObject:info.dictionaryValue forKey:[NSString stringWithFormat:@"Unit%d",info.hero.num.intValue] ];`
// [units setObject:info.dictionaryValue forKey:"Unit${info.hero.num.toInt()}" ];
// tslint:disable-next-line: no-invalid-template-strings
assert(setObject(s4) === "units['Unit${info.hero.num.toInt()}'] = info.dictionaryValue;");

const s5 = `[root setObject:[[Store sharedStore] dictionaryValue] forKey:"Store"];`;
assert(transform(s5) === `root['Store'] = Store.sharedStore().dictionaryValue();`)

assert(transform(`[root setObject:@"无" forKey:@"EventName"];`) === `root['EventName'] = "无";`)
assert(transform(`[root writeToFile:dataFile atomically:YES];`) === `root.writeToFile(dataFile,atomically:YES);`)

