const fs = require('fs');
const cheerio = require('cheerio');
const Rx = require('rx');

// See https://github.com/cheeriojs/cheerio
const dom = cheerio.load(fs.readFileSync('./grex2/auteurs.html'));
const slugify = string => {
    const a = 'àáäâãåèéëêìíïîòóöôùúüûñçßÿœæŕśńṕẃǵǹḿǘẍźḧ·/_,:;'
    const b = 'aaaaaaeeeeiiiioooouuuuncsyoarsnpwgnmuxzh------'
    const p = new RegExp(a.split('').join('|'), 'g')
    return string.toString().toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with
    .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
    .replace(/&/g, '-and-') // Replace & with ‘and’
    .replace(/[^\w\-]+/g, '') // Remove all non-word characters
    .replace(/\-\-+/g, '-') // Replace multiple — with single -
    .replace(/^-+/, '') // Trim — from start of text .replace(/-+$/, '') // Trim — from end of text
    .substr(0, 48)
};

const debug = entity => console.log(entity.id);
//const writer = () => () => {}

const author$ = new Rx.Subject();
const text$ = new Rx.Subject();
const texts = {};
text$.groupBy(text=> text.author_id)
    .subscribe(group$ => {
        console.log(group$.key);
        group$
            .filter(text => text.link && text.title)
            .subscribe(text => {
                console.log('   '+text.link)
                fs.copyFile(`./grex2/www.grex2.com/${text.link}`, `./site/static/pdf/${text.id}.pdf`, () => {});
                text.link = `/pdf/${text.id}.pdf`;

                fs.writeFile(
                    `./site/content/text/${text.id}.md`, 
                    `---
id: ${text.id}
title: ${text.title}
date: ${new Date()}
author_id: ${text.author_id}
author: ${text.author}
category: ${text.category}
family: ${text.family}
description: >-
${text.intro}
pdf: ${text.link}
---
`,
                () => {}
        );
    });
});
author$
    .map(author => ({
        ...author,
        id: slugify(author.name)
    }))
    .tap(debug)
    .map(author => ({
        file: `author/${author.id}.md`,
        data:`---
id: ${author.id}
name: ${author.name}
description: 
photo: ${author.photo}
---
    `
    }))
    //.take(1)
//    .subscribe(writer)

// Search authors
dom('div.aut-level1').each((i, authorEl) => {
    const author = {
        photo: dom(authorEl).find('img').attr('src'),
        name: dom(authorEl).find('h2').text().toString()
    };
    //console.log(author.name);
    //author$.onNext(author);
    // Search categories
    dom(authorEl).find(dom('div.aut-level2')).each((i, categoryEl) => {
        let category = dom(categoryEl).find(dom('a.aut-level2-a')).text();
        //console.log('   '+category+' = '+dom(categoryEl).find(dom('div.aut-level3')).length);
        
        dom(categoryEl).find(dom('div.aut-level3')).each((i, textEl) => {
            const text = {
                title: dom(textEl).find('a').attr('title'),
                link: dom(textEl).find('a').attr('href'),
                intro: dom(textEl).find('p').text().toString(),
                author: author.name,
                category: category,
                family: 'Auteurs du Grex'
            };
            text.title = text.title ? text.title : text.intro.substr(0, 32);
            text.id = slugify(text.title);
            text.author_id = slugify(text.author); 
            //console.log('       '+text.id);
            text$.onNext(text);
        });
    });
});
