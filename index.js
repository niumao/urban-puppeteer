const puppeteer = require('puppeteer');
const ora = require('ora');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const spinner = ora({ color: 'blue' });

const spiderUrl = "http://www.mca.gov.cn/article/sj/xzqh/2020/2020/202003301019.html";

// 省市区

(async () => {
    spinner.start(chalk.green('开始抓取数据...'));

    const browser = await puppeteer.launch({headless:true, timeout: 3000});
    const page = await browser.newPage();

    await page.goto(spiderUrl)

    spinner.text = chalk.green(`计算地址：${spiderUrl}`);

    let urbanArr = await page.evaluate(() => {
        urbanList = [...document.querySelectorAll('tbody tr')];
        formatList = [];
        urbanList.forEach(el => {
            formatList.push(el.innerText.trim())
        });
        formatList = formatList.slice(3, formatList.length - 9);
        return formatList;
    });
    let urbanFormatArr = [];
    let provice = {};
    let cities = {};
    let isSpecial = false;
    let proviceFlag = "99", cityFlag = "99", countyFlag = "99"; 
    urbanArr.forEach(el => {
        let curSel = el.split('\t');
        let code = curSel[0].trim()
        let name = curSel[1].trim()
        if(proviceFlag != code.substr(0,2)){
            if(Object.keys(provice).length != 0){
                provice.cities.push(cities)
                urbanFormatArr.push( provice)
                provice = {"code": code, "name": name, "cities": []};
                cities = {};
                isSpecial = false;
            }else{
                provice = {"code": code, "name": name, "cities": []};
            }
            proviceFlag = code.substr(0, 2)
        }else{
            if(isSpecial){
                cities.counties.push({"code": code, "name": name})
            }else{
                if(cityFlag != code.substr(2,2)){
                    if(Object.keys(cities).length != 0 ){
                        if( code.substr(4,2) == "00"){
                            provice["cities"].push(cities);
                        }else{
                            isSpecial = true;
                            cities = {"code": provice.code, "name": provice.name, "counties": []}
                            cities.counties.push({"code": code, "name": name})
                        }
                    }
                    if( code.substr(4,2) == "00"){
                        cities = {"code": code, "name": name, "counties": []}
                        cityFlag = code.substr(2,2);
                    }else{
                        isSpecial = true;
                        cities = {"code": provice.code, "name": provice.name, "counties": []}
                        cities.counties.push({"code": code, "name": name})
                    }
                }else{
                    cities.counties.push({"code": code, "name": name})
                }
            }
        }
    })
    
    fs.writeFileSync(path.resolve(__dirname, "urbans.js"), `${JSON.stringify(urbanFormatArr)}`);

    spinner.succeed(chalk.green("结束了"));

    await browser.close();
})();
