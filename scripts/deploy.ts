import { ethers } from "hardhat";

async function main() {
  
    const PARTICIPANTS_MIN = 3;
    const PARTICIPANTS_MAX = 5;

    const ADD_VERSION_QUORUM = 3;
    const REMOVE_VERSION_QUORUM = 4;

    const SET_MESSAGE_QUORUM = 2;
    const REMOVE_MESSAGE_QUORUM = 2;

    const ADD_PARTICIPANT_QUORUM = 4;
    const REMOVE_PARTICIPANT_QUORUM = 3;

    const QUORUM_TTL = 6000;

    // TODO: Fix signers for production
    const defaultParticipants = (await ethers.getSigners()).slice(0, 4);

    const appVersionController = await ethers.deployContract(
        "AppVersionController",
        [
          PARTICIPANTS_MIN, PARTICIPANTS_MAX,
          ADD_VERSION_QUORUM, REMOVE_VERSION_QUORUM,
          SET_MESSAGE_QUORUM, REMOVE_MESSAGE_QUORUM,
          ADD_PARTICIPANT_QUORUM, REMOVE_PARTICIPANT_QUORUM,
          QUORUM_TTL,
          defaultParticipants
        ]
    );

  await appVersionController.waitForDeployment();

  console.log(
    `AppVersionController with deployed to ${appVersionController.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
