// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.23;

/// @title Application Version Controller
/// @author Vadim Kalmykov
/// @notice You can use this contract for control versions of any applications and services
contract AppVersionController {
    enum VID {AddVersion, RemoveVersion, AddMessage, RemoveMessage, AddParticipant, RemoveParticipant}
    enum Status {NotExist, Active, Accepted, Rejected, Expired}

    struct Voting {
        address creator;
        uint8 quorum;
        address[] accepted;
        address[] rejected;
        uint startedAt;
    }

    struct Version {
        string version;
        string commitHash;
        string revisionBranch;
        string revisionHash;
        string[] binHashes;
        string description;
        uint timestamp;
    }

    error InvalidParticipantsNumber(uint8 min, uint8 max);
    error InvalidQuorum(uint8 min, uint8 max);
    error InvalidTTL(uint min, uint max);
    error VotingRemoveYourself(address yourself);
    error VotingAlreadyExists(VID vId);
    error VotingDoesNotExist(VID vId);
    error ParticipantAlreadyExists(address candidate);
    error ParticipantAlreadyVoted(address participant);
    error ParticipantDoesNotExist(address candidate);
    error ParticipantCannotVote(address participant);

    uint8 private immutable VID_TYPES = 6;

    /// @notice A minimum available number of participants
    uint8 public immutable participantsMin;

    /// @notice A maximum available number of participants
    uint8 public immutable participantsMax;

    /// @notice A minimum required accept votings for adding version acceptance
    uint8 public immutable versionAddQuorum;

    /// @notice A minimum required accept votings for removing version acceptance
    uint8 public immutable versionRemoveQuorum;

    /// @notice A minimum required accept votings for setting message acceptance
    uint8 public immutable messageAddQuorum;

    /// @notice A minimum required accept votings for dropping message acceptance
    uint8 public immutable messageRemoveQuorum;

    /// @notice A minimum required accept votings for adding new participant acceptance
    uint8 public immutable participantAddQuorum;

    /// @notice A minimum required accept votings for removing participant acceptance
    uint8 public immutable participantRemoveQuorum;

    /// @notice A total number of the participants
    uint8 public nParticipants;
    
    /// @notice A maximum lifetime of the active voting
    uint public immutable votingTTL;

    /// @notice Participants list (map)
    mapping(address candidate => bool isParticipant) public participants;

    /// @notice Votings list (map)
    mapping(VID votingId => Voting votingObject) public votings;

    /// @notice Public message
    string public message;

    /// @notice Approved versions list
    mapping(string versionId => Version versionObject) public versionsRepository;

    /// @notice Proposed to approving version
    Version public proposedVersion;

    /// @notice Proposed to removing version
    string public proposedRemoveVersion;

    /// @notice Proposed to setting message
    string public proposedMessage;

    /// @notice Proposed to adding participant
    address public proposedAddParticipant;

    /// @notice Proposed to removing participant
    address public proposedRemoveParticipant;

    /// Version added event
    /// @param creator Voting creator
    /// @param version Added version
    event VersionAdded(address indexed creator, string version);

    /// Version removed event
    /// @param creator Voting creator
    /// @param version Removed version
    event VersionRemoved(address indexed creator, string version);

    /// Message setted event
    /// @param creator Voting creator
    /// @param message Setted message
    event MessageAdded(address indexed creator, string message);

    /// Message dropped event
    /// @param creator Voting creator
    event MessageRemoved(address indexed creator);

    /// Participant added event
    /// @param creator Voting creator
    /// @param participant Added participant
    event ParticipantAdded(address indexed creator, address indexed participant);

    /// Participant removed event
    /// @param creator Voting creator
    /// @param participant Removed participant
    event ParticipantRemoved(address indexed creator, address indexed participant);

    modifier onlyParticipant {
        if (participants[msg.sender] == false)
            revert ParticipantDoesNotExist(msg.sender);
        _;
    }

    modifier onlyActive(VID vId) {
        // Active voting exists and has no expired
        if (getVotingStatus(vId) != Status.Active)
            revert VotingDoesNotExist(vId);
        _;
    }

    modifier onlyInactive(VID vId) {
        // There is no active voting of the type requested
        if (getVotingStatus(vId) == Status.Active)
            revert VotingAlreadyExists(vId);
        _;
    }

    /// Constructor
    /// @param defaultParticipantsMin A minimum available number of participants
    /// @param defaultParticipantsMax A maximum available number of participants
    /// @param defaultVersionAddQuorum A minimum required accept votings for adding version acceptance
    /// @param defaultVersionRemoveQuorum A minimum required accept votings for removing version acceptance
    /// @param defaultMessageAddQuorum A minimum required accept votings for setting message acceptance
    /// @param defaultMessageRemoveQuorum A minimum required accept votings for dropping message acceptance
    /// @param defaultParticipantAddQuorum A minimum required accept votings for adding new participant acceptance
    /// @param defaultParticipantRemoveQuorum A minimum required accept votings for removing participant acceptance
    /// @param defaultVotingTTL A maximum lifetime of the active voting
    /// @param defaultParticipants Default participants list
    constructor(
        uint8 defaultParticipantsMin,
        uint8 defaultParticipantsMax,

        uint8 defaultVersionAddQuorum,
        uint8 defaultVersionRemoveQuorum,

        uint8 defaultMessageAddQuorum,
        uint8 defaultMessageRemoveQuorum,

        uint8 defaultParticipantAddQuorum,
        uint8 defaultParticipantRemoveQuorum,

        uint defaultVotingTTL,

        address[] memory defaultParticipants
    )
    {
        if ((defaultParticipantsMin == 0) || (defaultParticipantsMin > defaultParticipantsMax))
            revert InvalidParticipantsNumber(1, 255);

        if ((defaultVersionAddQuorum == 0) || (defaultVersionAddQuorum > defaultParticipantsMax))
            revert InvalidQuorum(0, defaultParticipantsMax);

        if ((defaultVersionRemoveQuorum == 0) || (defaultVersionRemoveQuorum > defaultParticipantsMax))
            revert InvalidQuorum(0, defaultParticipantsMax);

        if ((defaultMessageAddQuorum == 0) || (defaultMessageAddQuorum > defaultParticipantsMax))
            revert InvalidQuorum(0, defaultParticipantsMax);

        if ((defaultMessageRemoveQuorum == 0) || (defaultMessageRemoveQuorum > defaultParticipantsMax))
            revert InvalidQuorum(0, defaultParticipantsMax);

        if ((defaultParticipantAddQuorum == 0) || (defaultParticipantAddQuorum > defaultParticipantsMax))
            revert InvalidQuorum(0, defaultParticipantsMax);

        if ((defaultParticipantRemoveQuorum == 0) || (defaultParticipantRemoveQuorum > defaultParticipantsMax))
            revert InvalidQuorum(0, defaultParticipantsMax);

        if (defaultVotingTTL == 0)
            revert InvalidTTL(1, 115792089237316195423570985008687907853269984665640564039457584007913129639935);

        if ((defaultParticipants.length < defaultParticipantsMin) || (defaultParticipants.length > defaultParticipantsMax))
            revert InvalidParticipantsNumber(defaultParticipantsMin, defaultParticipantsMax);

        participantsMin = defaultParticipantsMin;
        participantsMax = defaultParticipantsMax;

        versionAddQuorum = defaultVersionAddQuorum;
        versionRemoveQuorum = defaultVersionRemoveQuorum;

        messageAddQuorum = defaultMessageAddQuorum;
        messageRemoveQuorum = defaultMessageRemoveQuorum;

        participantAddQuorum = defaultParticipantAddQuorum;
        participantRemoveQuorum = defaultParticipantRemoveQuorum;

        votingTTL = defaultVotingTTL;

        nParticipants = uint8(defaultParticipants.length);
        for (uint i = 0; i < nParticipants; i ++) {
            participants[defaultParticipants[i]] = true;
        }
    }

    /// Function creates new voting about adding new proposed version
    /// @param versionInput New proposed version for adding
    function createVotingAddVersion(Version memory versionInput) external onlyParticipant onlyInactive(VID.AddVersion) {
        votings[VID.AddVersion] = newVoting(msg.sender, versionAddQuorum);
        proposedVersion = versionInput;
    }

    /// Function creates new voting about removing proposed version
    /// @param versionInput New proposed version for removing
    function createVotingRemoveVersion(string memory versionInput) external onlyParticipant onlyInactive(VID.RemoveVersion) {
        votings[VID.RemoveVersion] = newVoting(msg.sender, versionRemoveQuorum);
        proposedRemoveVersion = versionInput;
    }

    /// Function creates new voting about setting new public message
    /// @param messageInput New proposed message for setting
    function createVotingAddMessage(string memory messageInput) external onlyParticipant onlyInactive(VID.AddMessage) {
        votings[VID.AddMessage] = newVoting(msg.sender, messageAddQuorum);
        proposedMessage = messageInput;
    }

    /// Function creates new voting about dropping public message
    function createVotingRemoveMessage() external onlyParticipant onlyInactive(VID.RemoveMessage) {
        votings[VID.RemoveMessage] = newVoting(msg.sender, messageRemoveQuorum);
    }

    /// Function creates new voting about adding new proposed participant
    /// @param candidate Proposed participant
    function createVotingAddParticipant(address candidate) external onlyParticipant onlyInactive(VID.AddParticipant) {
        votings[VID.AddParticipant] = newVoting(msg.sender, participantAddQuorum);

        // We need to be sure that adding a new participant will not lead to exceeding the max number of participants
        if (nParticipants == participantsMax)
            revert InvalidParticipantsNumber(participantsMin, participantsMax);

        // We need to be sure that proposed candidate is not participant right now because we use independent variable
        // nParticipants for counting participants. Without this verification the counting problem will occur: the
        // real number of participants will not change but variable nParticipants will being increased
        if (participants[candidate] == true)
            revert ParticipantAlreadyExists(candidate);

        proposedAddParticipant = candidate;
    }

    /// Function creates new voting about removing proposed participant
    /// @param candidate Proposed participant
    function createVotingRemoveParticipant(address candidate) external onlyParticipant onlyInactive(VID.RemoveParticipant) {
        if (msg.sender == candidate)
            revert VotingRemoveYourself(msg.sender);
        
        votings[VID.RemoveParticipant] = newVoting(msg.sender, participantRemoveQuorum);

        // We need to be sure that removing a current participant will not lead to not exceeding the min number of participants
        if (nParticipants == participantsMin)
            revert InvalidParticipantsNumber(participantsMin, participantsMax);

        // We need to be sure that proposed candidate is participant right now because we use independent variable
        // nParticipants for counting participants. Without this verification the counting problem will occur: the
        // real number of participants will not change but variable nParticipants will being decreased
        if (participants[candidate] == false)
            revert ParticipantDoesNotExist(candidate);

        proposedRemoveParticipant = candidate;
    }

    /// Function registers accept/reject voting
    /// @param vId Voting Id
    /// @param accept Accept if true and reject otherwise
    function vote(VID vId, bool accept) external onlyParticipant onlyActive(vId) returns (Status) {
        // Current voter didn't vote previously
        if (hasVoted(vId, msg.sender) == true)
            revert ParticipantAlreadyVoted(msg.sender);

        if ((vId == VID.RemoveParticipant) && (msg.sender == proposedRemoveParticipant))
            revert ParticipantCannotVote(msg.sender);

        // Add voter's vote to the target
        if (accept) {
            votings[vId].accepted.push(msg.sender);
        }
        else {
            votings[vId].rejected.push(msg.sender);
        }

        //  At this point there are three possible voting statuses.
        //
        //  1. Active: the last vote didn't change the voting status
        //
        //  2. Accepted: the last vote has changed the voting status to Accepted
        //
        //  3. Rejected: the last vote has changed the voting status to Rejected
        //
        //  Note: NotExist and Expired statuses are impossible because there are 
        //        no changes those might change status to one of them
        //
        //  Each of these statuses doesn't require reset any contract state variables,
        //  except for only one case: if number of participants has been changed we 
        //  have to drop all active votings.

        Status status = getVotingStatus(vId);
        if (status == Status.Accepted) {

            if (vId == VID.AddVersion) {
                versionsRepository[proposedVersion.version] = proposedVersion;
                versionsRepository[proposedVersion.version].timestamp = block.timestamp;

                emit VersionAdded(votings[vId].creator, versionsRepository[proposedVersion.version].version);
            }

            if (vId == VID.RemoveVersion) {
                delete versionsRepository[proposedRemoveVersion];

                emit VersionRemoved(votings[vId].creator, proposedRemoveVersion);
            }

            if (vId == VID.AddMessage) {
                message = proposedMessage;

                emit MessageAdded(votings[vId].creator, message);
            }

            if (vId == VID.RemoveMessage) {
                delete message;

                emit MessageRemoved(votings[vId].creator);
            }

            if (vId == VID.AddParticipant) {
                participants[proposedAddParticipant] = true;
                nParticipants += 1;

                emit ParticipantAdded(votings[vId].creator, proposedAddParticipant);

                cancelVotings();
            }

            if (vId == VID.RemoveParticipant) {
                participants[proposedRemoveParticipant] = false;
                nParticipants -= 1;

                emit ParticipantRemoved(votings[vId].creator, proposedRemoveParticipant);

                cancelVotings();
            }
        }

        return status;
    }

    /// Function returns true if requested candidate is participant
    /// @param candidate Candidate for checking
    function isParticipant(address candidate) external view returns (bool) {
        return participants[candidate];
    }

    /// Function returns true if requested version was approved earlier
    /// @param version Version for checking
    function isRegisteredVersion(string memory version) external view returns (bool) {
        return (versionsRepository[version].timestamp != 0);
    }

    /// Function returns detailed info about requested version (if was approved earlier)
    /// @param version Version Id
    function getRegisteredVersion(string memory version) external view returns (Version memory) {
        return versionsRepository[version];
    }

    /// Function returns true if there is requested voting type
    /// @param vType Voting type
    function isRegisteredVoting(VID vType) external view returns (bool) {
        return votings[vType].startedAt != 0;
    }

    /// Function returns detailed info about requested voting type
    /// @param vType Voting type
    function getVotingByType(VID vType) public view returns (Voting memory) {
        return votings[vType];
    }

    /// Function returns actual voting status for requested voting id
    /// @param vId Voting Id
    function getVotingStatus(VID vId) public view returns (Status) {
        if (votings[vId].startedAt == 0) {
            return Status.NotExist;
        }

        if (votings[vId].accepted.length >= votings[vId].quorum) {
            return Status.Accepted;
        }

        if (nParticipants - votings[vId].rejected.length < votings[vId].quorum) {
            return Status.Rejected;
        }

        if (votings[vId].startedAt + votingTTL <= block.timestamp) {
            return Status.Expired;
        }

        return Status.Active;
    }

    /// Function cancels all votings of all types
    function cancelVotings() internal {
        for (uint vId = 0; vId < VID_TYPES; vId++){
            delete votings[VID(vId)];
        }
    }

    /// Function returns true if requested participant has voted
    /// @param vId Voting Id
    /// @param voter Participant address
    function hasVoted(VID vId, address voter) internal view returns (bool) {
        return contains(votings[vId].accepted, voter) || contains(votings[vId].rejected, voter);
    }

    /// Function creates new voting of the requested type
    /// @param creatorInput Voting creator address
    /// @param quorumInput Voting acceptance quorum
    function newVoting(address creatorInput, uint8 quorumInput) private view returns (Voting memory) {
        Voting memory voting = Voting({
            creator: creatorInput,
            accepted: new address[](1),
            rejected: new address[](0),
            quorum: quorumInput,
            startedAt: block.timestamp
        });
        voting.accepted[0] = voting.creator;

        return voting;
    }

    /// Function returns true if value is in array
    /// @param array Array
    /// @param value Value
    function contains(address[] memory array, address value) private pure returns (bool) {
        for (uint i = 0; i < array.length; i ++) {
            if (array[i] == value) {
                return true;
            }
        }

        return false;
    }
}