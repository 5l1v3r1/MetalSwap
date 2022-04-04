require("dotenv/config");
const { ethers } = require("ethers");
const parseArgs = require("minimist");
const { confirm } = require("./common/confirm");
const { txhandler } = require("./common/txhandler");
const UNISWAP = require("@uniswap/v2-periphery/build/UniswapV2Router01.json");
const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");

const PARAMETERS = Object.freeze([
  ["amount", ["amount", "a"]],
  ["sell", ["sell", "s"]],
  ["get", ["get", "g"]],
]);

async function main() {
  const argv = parseArgs(process.argv.slice(2), {
    string: ["amount", "a", "sell", "s", "get", "g"],
  });

  const paramsCheck = PARAMETERS.every(parameterTuple => {
    const [_name, [long, short]] = parameterTuple;
    return long in argv || short in argv;
  });

  if (!paramsCheck) {
    console.log(`
      Missing mandatory parameters!\n

      Help:\n

        --amount            -n : Amount to sell\n

        --sell              -s : Token to sell\n
    
        --get               -g : Token to get\n
    `);

    return;
  }

  const parameters = {};

  PARAMETERS.forEach(param => {
    const [name, [long, short]] = param;
    parameters[name] = argv[long] || argv[short];
  });

  const key = process.env.PRIVATE_KEY;
  const amount = parameters.amount;
  const token0Address = parameters.sell;
  const token1Address = parameters.get;
  const routerAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

  const url = 'https://bsc-dataseed.binance.org/';
  const provider = new ethers.providers.JsonRpcProvider(url);
  const signer = new ethers.Wallet(key, provider);
  const address = await signer.getAddress();

  const router = new ethers.Contract(routerAddress, UNISWAP.abi, signer);

  const token0 = new ethers.Contract(token0Address, ERC20.abi, signer);
  const name0 = await token0.name();
  const decimals = await token0.decimals();
  const parsedAmount = ethers.utils.parseUnits(amount, decimals);

  const token1 = new ethers.Contract(token1Address, ERC20.abi, signer);
  const name1 = await token1.name();

  const deadline = Math.floor(Date.now() / 1000) + 60 * 10; // 10 mins
  const path = [
      token0Address, // give
      token1Address, // get
  ];

  const quote = await router.getAmountsOut(parsedAmount, path);

  if (await confirm(`Are you sure you want to sell ${parsedAmount} ${name0} for ${quote[1]} ${name1}? (y/n)`)) {
    console.log(quote)

    await txhandler(
      router.swapExactTokensForETHSupportingFeeOnTransferTokens,
      parsedAmount,
      quote[1],
      path,
      address,
      deadline,
      { gasLimit: 30000000 }
    );

    console.log("Done");
  } else {
    console.log("Aborted");
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
