import {
    loadFixture, time,
  } from "@nomicfoundation/hardhat-toolbox/network-helpers";
  import { expect } from "chai";
  import { ethers } from "hardhat";

  describe("AppVersionController", function() {

    const VID_AddVersion = 0;
    const VID_RemoveVersion = 1;
    const VID_AddMessage = 2;
    const VID_RemoveMessage = 3;
    const VID_AddParticipant = 4; 
    const VID_RemoveParticipant = 5;

    const VID_TYPES = 6;

    const VOTING_NOT_EXIST = 0;
    const VOTING_ACTIVE = 1;
    const VOTING_ACCEPTED = 2;
    const VOTING_REJECTED = 3;
    const VOTING_EXPIRED = 4;

    const PARTICIPANTS_MIN = 3;
    const PARTICIPANTS_MAX = 5;

    const ADD_VERSION_QUORUM = 3;
    const REMOVE_VERSION_QUORUM = 4;

    const SET_MESSAGE_QUORUM = 2;
    const REMOVE_MESSAGE_QUORUM = 2;

    const ADD_PARTICIPANT_QUORUM = 4;
    const REMOVE_PARTICIPANT_QUORUM = 3;

    const QUORUM_TTL = 6000;

    async function deployAppVersionControllerFixture() {
        const defaultParticipants = (await ethers.getSigners()).slice(0, 4);

        const AppVersionController = await ethers.getContractFactory("AppVersionController");
        const appVersionController = await AppVersionController.deploy(
            PARTICIPANTS_MIN, PARTICIPANTS_MAX,
            ADD_VERSION_QUORUM, REMOVE_VERSION_QUORUM,
            SET_MESSAGE_QUORUM, REMOVE_MESSAGE_QUORUM,
            ADD_PARTICIPANT_QUORUM, REMOVE_PARTICIPANT_QUORUM,
            QUORUM_TTL,
            defaultParticipants
        );

        return {appVersionController, defaultParticipants};
    }

    describe("Deployment", function(){
        it("Should set the right deploy parameters", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            var isParticipant = true;
            defaultParticipants.forEach(async function(value) {
                isParticipant = isParticipant && (await appVersionController.isParticipant(value));
            });
            expect(isParticipant).to.be.true;
          });
    })

    describe("Voting Creation", function(){
        it("Should create the «Add Version» voting", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingAddVersion({
                version: "1.3.0",
                commitHash: "123",
                revisionBranch: "456",
                revisionHash: "789",
                binHashes: ["hash 1", "hash 2", "hash 3"],
                description: "test description",
                timestamp: 0
            });

            const voting = await appVersionController.getVotingByType(VID_AddVersion);
            expect(voting.creator).to.equal(defaultParticipants[0].address);
            expect(voting.accepted[0]).to.equal(voting.creator);
            expect(voting.rejected.length).to.equal(0);
            expect(voting.quorum).to.equal(ADD_VERSION_QUORUM);
            expect(voting.startedAt).to.not.equal(0);            
        });

        it("Should create the «Remove Version» voting", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingRemoveVersion("1.3.0");

            const voting = await appVersionController.getVotingByType(VID_RemoveVersion);
            expect(voting.creator).to.equal(defaultParticipants[0].address);
            expect(voting.accepted[0]).to.equal(voting.creator);
            expect(voting.rejected.length).to.equal(0);
            expect(voting.quorum).to.equal(REMOVE_VERSION_QUORUM);
            expect(voting.startedAt).to.not.equal(0);            
        });

        it("Should create the «Add Message» voting", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingAddMessage("Soika Wallet");

            const voting = await appVersionController.getVotingByType(VID_AddMessage);
            expect(voting.creator).to.equal(defaultParticipants[0].address);
            expect(voting.accepted[0]).to.equal(voting.creator);
            expect(voting.rejected.length).to.equal(0);
            expect(voting.quorum).to.equal(SET_MESSAGE_QUORUM);
            expect(voting.startedAt).to.not.equal(0);            
        });

        it("Should create the «Remove Message» voting", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingRemoveMessage();

            const voting = await appVersionController.getVotingByType(VID_RemoveMessage);
            expect(voting.creator).to.equal(defaultParticipants[0].address);
            expect(voting.accepted[0]).to.equal(voting.creator);
            expect(voting.rejected.length).to.equal(0);
            expect(voting.quorum).to.equal(REMOVE_MESSAGE_QUORUM);
            expect(voting.startedAt).to.not.equal(0);            
        });

        it("Should create the «Add Participant» voting", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingAddParticipant((await ethers.getSigners())[5].address);

            const voting = await appVersionController.getVotingByType(VID_AddParticipant);
            expect(voting.creator).to.equal(defaultParticipants[0].address);
            expect(voting.accepted[0]).to.equal(voting.creator);
            expect(voting.rejected.length).to.equal(0);
            expect(voting.quorum).to.equal(ADD_PARTICIPANT_QUORUM);
            expect(voting.startedAt).to.not.equal(0);            
        });

        it("Should can't create the «Remove Participant» voting with himself removing", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await expect(appVersionController.connect(defaultParticipants[0]).createVotingRemoveParticipant(defaultParticipants[0].address)).to.be.reverted;
        });

        it("Should create the «Remove Participant» voting", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.connect(defaultParticipants[0]).createVotingRemoveParticipant(defaultParticipants[1].address);

            const voting = await appVersionController.getVotingByType(VID_RemoveParticipant);
            expect(voting.creator).to.equal(defaultParticipants[0].address);
            expect(voting.accepted[0]).to.equal(voting.creator);
            expect(voting.rejected.length).to.equal(0);
            expect(voting.quorum).to.equal(REMOVE_PARTICIPANT_QUORUM);
            expect(voting.startedAt).to.not.equal(0);            
        });

        it("Should cannot vote the «Remove Participant» voting if he is being removed participant", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.connect(defaultParticipants[0]).createVotingRemoveParticipant(defaultParticipants[1].address);

            const voting = await appVersionController.getVotingByType(VID_RemoveParticipant);
            expect(voting.creator).to.equal(defaultParticipants[0].address);
            expect(voting.accepted[0]).to.equal(voting.creator);
            expect(voting.rejected.length).to.equal(0);
            expect(voting.quorum).to.equal(REMOVE_PARTICIPANT_QUORUM);
            expect(voting.startedAt).to.not.equal(0);            

            await expect(appVersionController.connect(defaultParticipants[1]).vote(VID_RemoveParticipant, false)).to.be.reverted;
        });
    })

    describe("Voting Restrictions", function(){
        it("Should revert non-participant voting transaction", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingAddVersion({
                version: "1.3.0",
                commitHash: "123",
                revisionBranch: "456",
                revisionHash: "789",
                binHashes: ["hash 1", "hash 2", "hash 3"],
                description: "test description",
                timestamp: 0
            });

            const stranger = (await ethers.getSigners())[Number(await appVersionController.nParticipants())];
            await expect(appVersionController.connect(stranger).vote(VID_AddMessage, true)).to.be.reverted;
        })

        it("Should revert double voting transaction", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingAddVersion({
                version: "1.3.0",
                commitHash: "123",
                revisionBranch: "456",
                revisionHash: "789",
                binHashes: ["hash 1", "hash 2", "hash 3"],
                description: "test description",
                timestamp: 0
            });

            const lastParticipant = (await ethers.getSigners())[Number(await appVersionController.nParticipants()) - 1];

            await appVersionController.connect(lastParticipant).vote(VID_AddVersion, true);
            await expect(appVersionController.connect(lastParticipant).vote(VID_AddVersion, true)).to.be.reverted;
        })

        it("Should take into account the accept vote", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingAddVersion({
                version: "1.3.0",
                commitHash: "123",
                revisionBranch: "456",
                revisionHash: "789",
                binHashes: ["hash 1", "hash 2", "hash 3"],
                description: "test description",
                timestamp: 0
            });

            const lastParticipant = (await ethers.getSigners())[Number(await appVersionController.nParticipants()) - 1];

            await appVersionController.connect(lastParticipant).vote(VID_AddVersion, true);

            const voting = await appVersionController.getVotingByType(VID_AddVersion);
            expect(voting.accepted[1]).to.equal(lastParticipant.address);
        })

        it("Should take into account the reject vote", async function () {
            const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

            await appVersionController.createVotingAddVersion({
                version: "1.3.0",
                commitHash: "123",
                revisionBranch: "456",
                revisionHash: "789",
                binHashes: ["hash 1", "hash 2", "hash 3"],
                description: "test description",
                timestamp: 0
            });

            const lastParticipant = (await ethers.getSigners())[Number(await appVersionController.nParticipants()) - 1];

            await appVersionController.connect(lastParticipant).vote(VID_AddVersion, false);
        
            const voting = await appVersionController.getVotingByType(VID_AddVersion);
            expect(voting.rejected[0]).to.equal(lastParticipant.address);
        })
  })

  describe("Voting Results", function(){
    it("Should apply result of the «Add Version» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddVersion({
            version: "1.3.0",
            commitHash: "123",
            revisionBranch: "456",
            revisionHash: "789",
            binHashes: ["hash 1", "hash 2", "hash 3"],
            description: "test description",
            timestamp: 0
        });

        const voting = await appVersionController.getVotingByType(VID_AddVersion);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(ADD_VERSION_QUORUM);
        expect(voting.startedAt).to.not.equal(0); 
        
        for (let i = 1; i < Number(await appVersionController.versionAddQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddVersion, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddVersion))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.isRegisteredVersion("1.3.0")).to.be.true;
    });

    it("Should reject result of the «Add Version» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddVersion({
            version: "1.3.0",
            commitHash: "123",
            revisionBranch: "456",
            revisionHash: "789",
            binHashes: ["hash 1", "hash 2", "hash 3"],
            description: "test description",
            timestamp: 0
        });

        const voting = await appVersionController.getVotingByType(VID_AddVersion);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(ADD_VERSION_QUORUM);
        expect(voting.startedAt).to.not.equal(0); 
        
        for (let i = 1; i < Number(await appVersionController.nParticipants()) - Number(await appVersionController.versionAddQuorum()) + 2; i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddVersion, false);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddVersion))).to.be.equal(VOTING_REJECTED);
        await expect(await appVersionController.isRegisteredVersion("1.3.0")).to.be.false;
    });

    it("Should apply results of the «Remove Version» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddVersion({
            version: "1.3.0",
            commitHash: "123",
            revisionBranch: "456",
            revisionHash: "789",
            binHashes: ["hash 1", "hash 2", "hash 3"],
            description: "test description",
            timestamp: 0
        });

        const addVoting = await appVersionController.getVotingByType(VID_AddVersion);
        expect(addVoting.creator).to.equal(defaultParticipants[0].address);
        expect(addVoting.accepted[0]).to.equal(addVoting.creator);
        expect(addVoting.rejected.length).to.equal(0);
        expect(addVoting.quorum).to.equal(ADD_VERSION_QUORUM);
        expect(addVoting.startedAt).to.not.equal(0); 
        
        for (let i = 1; i < Number(await appVersionController.versionAddQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddVersion, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddVersion))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.isRegisteredVersion("1.3.0")).to.be.true;

        await appVersionController.connect(defaultParticipants[0]).createVotingRemoveVersion("1.3.0");

        const rmVoting = await appVersionController.getVotingByType(VID_RemoveVersion);
        expect(rmVoting.creator).to.equal(defaultParticipants[0].address);
        expect(rmVoting.accepted[0]).to.equal(rmVoting.creator);
        expect(rmVoting.rejected.length).to.equal(0);
        expect(rmVoting.quorum).to.equal(REMOVE_VERSION_QUORUM);
        expect(rmVoting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.versionRemoveQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_RemoveVersion, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_RemoveVersion))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.isRegisteredVersion("1.3.0")).to.be.false;
    });

    it("Should reject results of the «Remove Version» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddVersion({
            version: "1.3.0",
            commitHash: "123",
            revisionBranch: "456",
            revisionHash: "789",
            binHashes: ["hash 1", "hash 2", "hash 3"],
            description: "test description",
            timestamp: 1
        });

        const addVoting = await appVersionController.getVotingByType(VID_AddVersion);
        expect(addVoting.creator).to.equal(defaultParticipants[0].address);
        expect(addVoting.accepted[0]).to.equal(addVoting.creator);
        expect(addVoting.rejected.length).to.equal(0);
        expect(addVoting.quorum).to.equal(ADD_VERSION_QUORUM);
        expect(addVoting.startedAt).to.not.equal(0); 
        
        for (let i = 1; i < Number(await appVersionController.versionAddQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddVersion, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddVersion))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.isRegisteredVersion("1.3.0")).to.be.true;

        await appVersionController.connect(defaultParticipants[0]).createVotingRemoveVersion("1.3.0");

        const rmVoting = await appVersionController.getVotingByType(VID_RemoveVersion);
        expect(rmVoting.creator).to.equal(defaultParticipants[0].address);
        expect(rmVoting.accepted[0]).to.equal(rmVoting.creator);
        expect(rmVoting.rejected.length).to.equal(0);
        expect(rmVoting.quorum).to.equal(REMOVE_VERSION_QUORUM);
        expect(rmVoting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.nParticipants()) - Number(await appVersionController.versionRemoveQuorum()) + 2; i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_RemoveVersion, false);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_RemoveVersion))).to.be.equal(VOTING_REJECTED);
        await expect(await appVersionController.isRegisteredVersion("1.3.0")).to.be.true;
    });

    it("Should apply results of the «Add Message» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddMessage("Soika Wallet");

        const voting = await appVersionController.getVotingByType(VID_AddMessage);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(SET_MESSAGE_QUORUM);
        expect(voting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.messageAddQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddMessage, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddMessage))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.message()).equal("Soika Wallet");
    });

    it("Should reject results of the «Add Message» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddMessage("Soika Wallet");

        const voting = await appVersionController.getVotingByType(VID_AddMessage);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(SET_MESSAGE_QUORUM);
        expect(voting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.nParticipants()) - Number(await appVersionController.messageAddQuorum()) + 2; i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddMessage, false);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddMessage))).to.be.equal(VOTING_REJECTED);
        await expect(await appVersionController.message()).not.equal("Soika Wallet");
    });

    it("Should apply results of the «Remove Message» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddMessage("Soika Wallet");

        const addVoting = await appVersionController.getVotingByType(VID_AddMessage);
        expect(addVoting.creator).to.equal(defaultParticipants[0].address);
        expect(addVoting.accepted[0]).to.equal(addVoting.creator);
        expect(addVoting.rejected.length).to.equal(0);
        expect(addVoting.quorum).to.equal(SET_MESSAGE_QUORUM);
        expect(addVoting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.messageAddQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddMessage, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddMessage))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.message()).equal("Soika Wallet");

        await appVersionController.connect(defaultParticipants[0]).createVotingRemoveMessage();

        const voting = await appVersionController.getVotingByType(VID_RemoveMessage);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(REMOVE_MESSAGE_QUORUM);
        expect(voting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.messageRemoveQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_RemoveMessage, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_RemoveMessage))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.message()).not.equal("Soika Wallet");
    });

    it("Should reject results of the «Remove Message» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingAddMessage("Soika Wallet");

        const addVoting = await appVersionController.getVotingByType(VID_AddMessage);
        expect(addVoting.creator).to.equal(defaultParticipants[0].address);
        expect(addVoting.accepted[0]).to.equal(addVoting.creator);
        expect(addVoting.rejected.length).to.equal(0);
        expect(addVoting.quorum).to.equal(SET_MESSAGE_QUORUM);
        expect(addVoting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.messageAddQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddMessage, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddMessage))).to.be.equal(VOTING_ACCEPTED);
        await expect(await appVersionController.message()).equal("Soika Wallet");

        await appVersionController.connect(defaultParticipants[0]).createVotingRemoveMessage();

        const voting = await appVersionController.getVotingByType(VID_RemoveMessage);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(REMOVE_MESSAGE_QUORUM);
        expect(voting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.nParticipants()) - Number(await appVersionController.messageRemoveQuorum()) + 2; i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_RemoveMessage, false);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_RemoveMessage))).to.be.equal(VOTING_REJECTED);
        await expect(await appVersionController.message()).equal("Soika Wallet");
    });

    it("Should apply results of the «Add Participant» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.createVotingAddParticipant((await ethers.getSigners())[5].address);

        const voting = await appVersionController.getVotingByType(VID_AddParticipant);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(ADD_PARTICIPANT_QUORUM);
        expect(voting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.participantAddQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddParticipant, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddParticipant))).to.be.equal(VOTING_NOT_EXIST);
        await expect(await appVersionController.nParticipants()).equal(defaultParticipants.length + 1);
        await expect(await appVersionController.isParticipant((await ethers.getSigners())[5].address)).to.be.true;
    });

    it("Should reject results of the «Add Participant» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.createVotingAddParticipant((await ethers.getSigners())[5].address);

        const voting = await appVersionController.getVotingByType(VID_AddParticipant);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(ADD_PARTICIPANT_QUORUM);
        expect(voting.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.nParticipants()) - Number(await appVersionController.participantAddQuorum()) + 2; i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddParticipant, false);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddParticipant))).to.be.equal(VOTING_REJECTED);
        await expect(await appVersionController.nParticipants()).equal(defaultParticipants.length);
        await expect(await appVersionController.isParticipant((await ethers.getSigners())[5].address)).to.be.false;
    });

    it("Should apply results of the «Remove Participant» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingRemoveParticipant(defaultParticipants[3].address);

        const voting = await appVersionController.getVotingByType(VID_RemoveParticipant);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(REMOVE_PARTICIPANT_QUORUM);
        expect(voting.startedAt).to.not.equal(0);                

        for (let i = 1; i < Number(await appVersionController.participantRemoveQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_RemoveParticipant, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_RemoveParticipant))).to.be.equal(VOTING_NOT_EXIST);
        await expect(await appVersionController.nParticipants()).equal(defaultParticipants.length - 1);
        await expect(await appVersionController.isParticipant((await ethers.getSigners())[3].address)).to.be.false;
    });

    it("Should reject results of the «Remove Participant» voting", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.connect(defaultParticipants[0]).createVotingRemoveParticipant(defaultParticipants[3].address);

        const voting = await appVersionController.getVotingByType(VID_RemoveParticipant);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(REMOVE_PARTICIPANT_QUORUM);
        expect(voting.startedAt).to.not.equal(0);                

        for (let i = 1; i < Number(await appVersionController.nParticipants()) - Number(await appVersionController.participantRemoveQuorum()) + 2; i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_RemoveParticipant, false);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_RemoveParticipant))).to.be.equal(VOTING_REJECTED);
        await expect(await appVersionController.nParticipants()).equal(defaultParticipants.length);
        await expect(await appVersionController.isParticipant((await ethers.getSigners())[3].address)).to.be.true;
    });

    it("Should cancel all votings if results of the «Add Participant» was applied", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.createVotingAddVersion({
            version: "1.3.0",
            commitHash: "123",
            revisionBranch: "456",
            revisionHash: "789",
            binHashes: ["hash 1", "hash 2", "hash 3"],
            description: "test description",
            timestamp: 0
        });

        const votingVersion = await appVersionController.getVotingByType(VID_AddVersion);
        expect(votingVersion.creator).to.equal(defaultParticipants[0].address);
        expect(votingVersion.accepted[0]).to.equal(votingVersion.creator);
        expect(votingVersion.rejected.length).to.equal(0);
        expect(votingVersion.quorum).to.equal(ADD_VERSION_QUORUM);
        expect(votingVersion.startedAt).to.not.equal(0);  

        await appVersionController.createVotingAddMessage("Soika Wallet");

        const votingMessage = await appVersionController.getVotingByType(VID_AddMessage);
        expect(votingMessage.creator).to.equal(defaultParticipants[0].address);
        expect(votingMessage.accepted[0]).to.equal(votingMessage.creator);
        expect(votingMessage.rejected.length).to.equal(0);
        expect(votingMessage.quorum).to.equal(SET_MESSAGE_QUORUM);
        expect(votingMessage.startedAt).to.not.equal(0);   

        await appVersionController.createVotingAddParticipant((await ethers.getSigners())[5].address);

        const votingParticipant = await appVersionController.getVotingByType(VID_AddParticipant);
        expect(votingParticipant.creator).to.equal(defaultParticipants[0].address);
        expect(votingParticipant.accepted[0]).to.equal(votingParticipant.creator);
        expect(votingParticipant.rejected.length).to.equal(0);
        expect(votingParticipant.quorum).to.equal(ADD_PARTICIPANT_QUORUM);
        expect(votingParticipant.startedAt).to.not.equal(0);            

        for (let i = 1; i < Number(await appVersionController.participantAddQuorum()); i ++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_AddParticipant, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_AddParticipant))).to.be.equal(VOTING_NOT_EXIST);
        await expect(await appVersionController.nParticipants()).equal(defaultParticipants.length + 1);
        await expect(await appVersionController.isParticipant((await ethers.getSigners())[5].address)).to.be.true;

        for (let i = 0; i < VID_TYPES; i ++) {
            await expect (await appVersionController.getVotingStatus(i)).to.be.equal(VOTING_NOT_EXIST);
        }
    });

    it("Should cancel all votings if results of the «Remove Participant» was applied", async function () {
        const {appVersionController, defaultParticipants} = await loadFixture(deployAppVersionControllerFixture);

        await appVersionController.createVotingAddVersion({
            version: "1.3.0",
            commitHash: "123",
            revisionBranch: "456",
            revisionHash: "789",
            binHashes: ["hash 1", "hash 2", "hash 3"],
            description: "test description",
            timestamp: 0
        });

        const votingVersion = await appVersionController.getVotingByType(VID_AddVersion);
        expect(votingVersion.creator).to.equal(defaultParticipants[0].address);
        expect(votingVersion.accepted[0]).to.equal(votingVersion.creator);
        expect(votingVersion.rejected.length).to.equal(0);
        expect(votingVersion.quorum).to.equal(ADD_VERSION_QUORUM);
        expect(votingVersion.startedAt).to.not.equal(0);  

        await appVersionController.createVotingAddMessage("Soika Wallet");

        const votingMessage = await appVersionController.getVotingByType(VID_AddMessage);
        expect(votingMessage.creator).to.equal(defaultParticipants[0].address);
        expect(votingMessage.accepted[0]).to.equal(votingMessage.creator);
        expect(votingMessage.rejected.length).to.equal(0);
        expect(votingMessage.quorum).to.equal(SET_MESSAGE_QUORUM);
        expect(votingMessage.startedAt).to.not.equal(0);   

        await appVersionController.connect(defaultParticipants[0]).createVotingRemoveParticipant(defaultParticipants[3].address);

        const voting = await appVersionController.getVotingByType(VID_RemoveParticipant);
        expect(voting.creator).to.equal(defaultParticipants[0].address);
        expect(voting.accepted[0]).to.equal(voting.creator);
        expect(voting.rejected.length).to.equal(0);
        expect(voting.quorum).to.equal(REMOVE_PARTICIPANT_QUORUM);
        expect(voting.startedAt).to.not.equal(0);                

        for (let i = 1; i < Number(await appVersionController.participantRemoveQuorum()); i++) {
            await appVersionController.connect(defaultParticipants[i]).vote(VID_RemoveParticipant, true);
        }

        await expect(Number(await appVersionController.getVotingStatus(VID_RemoveParticipant))).to.be.equal(VOTING_NOT_EXIST);
        await expect(await appVersionController.nParticipants()).equal(defaultParticipants.length - 1);
        await expect(await appVersionController.isParticipant((await ethers.getSigners())[3].address)).to.be.false;

        for (let i = 0; i < VID_TYPES; i ++) {
            await expect (await appVersionController.getVotingStatus(i)).to.be.equal(VOTING_NOT_EXIST);
        }
    });

})
})