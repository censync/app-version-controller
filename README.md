# Documentation
This chapter contains information about running tests and deploy.

## Run tests
```shell
REPORT_GAS=true npx hardhat test
```
## Deploy
```shell
npx hardhat node
npx hardhat run scripts/deploy.ts --show-stack-traces
```

## License

The soikawallet-contracts is licensed under the
[GNU Lesser General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html),
also included in our repository in the `LICENSE` file.
