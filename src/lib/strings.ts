
export function sentence(text: string, offset: number) {
    var substr = text.substring(offset)
    var newStr = substr;
    console.log(text, offset, newStr);

    const regex = /“(.+?)”/g;
    const chatSentences = newStr.match(regex) || [];
    console.log(chatSentences);

    for (let index = 0; index < chatSentences.length; index++) {
        newStr = newStr.replace(chatSentences[index], `{$${index}}！`);
    }

    const regex2 = /“(.+)/g;
    const chatSentences2 = newStr.match(regex2) || [];
    if (0 < chatSentences2.length) {
        return { index: -1, length: 0, text: "" };
    }

    const regex1 = /(.*?)[。！？；\n]+/g;
    const sentences = newStr.match(regex1) || [];
    // console.log(sentences);
    const result: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
        let indexRegex = /{\$([0-9]+)}！/g;
        let sentence = sentences[i];
        let matches = indexRegex.exec(sentence);
        if (matches) {
            result[i] = sentence.replace(matches[0], chatSentences[Number(matches[1])]);
        } else {
            result[i] = sentence;
        }
    }

    if (0 < result.length) {
        return {
            index: substr.indexOf(result[0]) + (offset === -1 ? 0 : offset),
            length: result[0].length,
            text: result[0]
        };
    } else {
        return { index: -1, length: 0, text: "" };
    }
}

export function print(obj: any) {
    console.log(obj);
    return obj;
}