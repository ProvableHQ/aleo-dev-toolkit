import { Record, Plaintext } from "../src/data";
import { Transaction } from "../src/transaction";
import { parseValueToJson } from "../src/parsers/plaintext";

const exampleAuctionRecord = {
  owner: "aleo1xyz...",
  auction_id: "123field",
  highest_bid: "456field",
  winner: "aleo1abc...",
  nonce: "789field",
};

test("Record type matches auction record structure", () => {
  const record: Record = exampleAuctionRecord;
  
  // Check owner
  expect(record.owner).toContain("aleo1");

  // Check auction_id
  expect((record.auction_id as string).endsWith("field")).toBe(true);

  // Check highest_bid
  expect((record.highest_bid as string).endsWith("field")).toBe(true);

  // Check winner
  expect(record.winner).toContain("aleo1");

  // Check nonce
  expect(record.nonce.endsWith("field")).toBe(true);
});

test("fails if owner address is invalid", () => {
  const badRecord = {
    ...exampleAuctionRecord,
    owner: "badownerstring",
  };

  expect(badRecord.owner.startsWith("aleo1")).toBe(false);
});
// @ts-expect-error - owner must be a string
const badOwner: Record = {
  ...exampleAuctionRecord,
  // @ts-expect-error - owner must be a string
  owner: 12345,
};

// @ts-expect-error - auction_id must be a string (field)
const badAuctionId: Record = {
  ...exampleAuctionRecord,
  auction_id: true,
};

const actualTxFromAPI: Transaction = 
  {
    "type": "execute",
    "id": "at16gn574xqj5svyzeqxv25g93phr6rn7exzt75lxz94702rup23gfqu3sjsc",
    "execution": {
      "transitions": [
        {
          "id": "au1xkthsz95cfzf5dpm35j8rfmqh7d55n5qaj32h04zuk94hgs9ysqqwd5y0t",
          "program": "credits.aleo",
          "function": "transfer_public",
          "inputs": [
            {
              "type": "public",
              "id": "4751135245718319934677221244600857477393936843410399077399851644790898074286field",
              "value": "aleo1nde82xqshcyjq2r3qjel7pphk3zfs928w5dqhuc6g2ywquef7srsmrpjgr"
            },
            {
              "type": "public",
              "id": "1879683531456735826402444579986765299787803396630464445477045553705002014280field",
              "value": "925201u64"
            }
          ],
          "outputs": [
            {
              "type": "future",
              "id": "2994313978289013878278992580863624909125270283430786031571774165789697880797field",
              "value": "{\n  program_id: credits.aleo,\n  function_name: transfer_public,\n  arguments: [\n    aleo12zlythl7htjdtjjjz3ahdj4vl6wk3zuzm37s80l86qpx8fyx95fqnxcn2f,\n    aleo1nde82xqshcyjq2r3qjel7pphk3zfs928w5dqhuc6g2ywquef7srsmrpjgr,\n    925201u64\n  ]\n}"
            }
          ],
          "tpk": "8419054782389922523785643599671399767271074354181851447409278470077027626643group",
          "tcm": "6974764911181620995275580693649999038426099390529716278259719011415424425408field",
          "scm": "5706857385070162410502976527403449803156980745820557401650769519800215382444field"
        }
      ],
      "global_state_root": "sr1cxx6uf72kla7hzu65m394fljpup39h3efe97xsn2wm2gl9apjgyqdr94ud",
      "proof": "proof1qyqsqqqqqqqqqqqpqqqqqqqqqqqvs2nmr0pnyufteq8wtf080x3vwfh5yk08d6pjmedl8j7gx6a42das2ul7rm9x6wn5tvars43nudvqq9gshva80utleuytjesa4vmkq4cv6kfcm6axn2pwf7klzk402gf9qn5t0ssz3mut0ycjcjwss4e76qrh46q8r8calfmrwmpmwj2j063rsgtvq4v85v8gzlyyy233f90pztncnx9pr65l28vuqwx86n0p2xqws3lw0a2qs4smanr5eq78rgn2t2vtvnfu07589676v86kjxdfc6nqdvmghjvc25zzh7qwj2jxmk5qtu5ecxd8mpx00mjs4q2sen68w57zk6c3e7xnm7jeelrqhuexaae9n8v9ddagrl27wwn8zg8vwv9srrar48d0aqslsmzt6lqnxq2mwn0y89zxtrsfs8uzphrc3geu9y5pn2m90k45s5cqt4ypw8rqea53qprslzcs0xpuhc6gc59lfxk0fz49wj70pxe4wczpnxcendf6f7ep49svrsamw2nn39y02dt3l85ztqr09hcxd6h9382cq2s3j890g6ezu2lktszy278dxhuxj47qmmjs2m2p78ud9s3m7pkrusrqwj65f6qv4h0spx0jsrs0vcyapz868egt4g6jf9zwmdkfn5d4966234td44gzcvzwghl2tcxxpl0vt70366upqd7se7pf8vmlvujalgwglgzu2tnrp474nmuvewflrd6eg8j6usg5c6l5vydrkjav4lqx8n4d83nre9qex57ut3nunlyccedx3npxuqzu4fk6293yxxd0sd05jrtxkjpckqrvaaxnng22j9dxnlrvxm24ql5880tdnd8mwsmhz9hf4tnwlrl65xu2x9tuqz5c4nsha95hqlksj3mapzmc5672md4hckakxfpt28znt0st8p3xwt05a3usl3remvc9e5ng8quakjgax4aquczfqvdxzwstm8et5tgdptkt84wnklwn5c8cy93ezx7rh4jve5dn2t8zcn32vph0d8sx583j6uqz6sg8mjs6upgdsf47d6ageygydpve89p3tsshx5vt98jzet9hnkfacky5hpxgqlgnm0dvchgylg3prq05gq7kzdu8narls66gg7nxml0hzqsrh0lqez38m40dzt9zzg985frap8m43ehfk5z9lpsazc7jx0fyp2qcrncdqvqqqqqqqqqqqkfq8j9ez9zl7gycv3wzsjez8amk3lkrptn62v0xp805dmckhl38k3hn0vc5v54wre6m0n8mcvz3qyq2fchjxd29juplmjywlrfz83zkq2ev6mxryx5dz43tcwneamnpa5m6ezycmqed4dsfrm342e3693qqq8gj3sheypdtugcnxfuvw5pqn5glpxc8hy8efn8z366lm6l46luqpfn0c6cv8jnfkqg8x0djhm97ex4w43ljp2q3p48puy5qg7plrl3082j669dptpvp62h8wrmvl4ggsyqqxqxmd4"
    },
    "fee": {
      "transition": {
        "id": "au16g35t6kzca6xuussmuzgj66lauha7zhelnzwffjn7yu6drxjeypsn4krsj",
        "program": "credits.aleo",
        "function": "fee_public",
        "inputs": [
          {
            "type": "public",
            "id": "3177838991993329157371463969436206958196792727562912766690990977845094638574field",
            "value": "51060u64"
          },
          {
            "type": "public",
            "id": "2627337663134718050564293263748856215620738953487067677249260721057439613985field",
            "value": "0u64"
          },
          {
            "type": "public",
            "id": "134393209519715768094240338334285854725427616329679089213660428639338330639field",
            "value": "4485998228444633245424449325268791226620568930423610568011053349827561756688field"
          }
        ],
        "outputs": [
          {
            "type": "future",
            "id": "5836606895323199242961194308370430847063995678474974835973924196936593737068field",
            "value": "{\n  program_id: credits.aleo,\n  function_name: fee_public,\n  arguments: [\n    aleo12zlythl7htjdtjjjz3ahdj4vl6wk3zuzm37s80l86qpx8fyx95fqnxcn2f,\n    51060u64\n  ]\n}"
          }
        ],
        "tpk": "5133974047416696841315369281389544483681028470433387841583387079449986330429group",
        "tcm": "795609109724429421407275371955802534344227027480936262614604311690962025301field",
        "scm": "3903849113674739385296398736730232388289952783409244858026975082444581569623field"
      },
      "global_state_root": "sr1cxx6uf72kla7hzu65m394fljpup39h3efe97xsn2wm2gl9apjgyqdr94ud",
      "proof": "proof1qyqsqqqqqqqqqqqpqqqqqqqqqqqzlgwysc4ejcm695fnp8sc8akg23s5vkkqx80mp75q5trcc3rhasdnutvds5q5c9hpz8fy9k4z78upq9t8de7kznvtlfyzskqj3llaulq3t8ftglvrum67997m0su5gxe2cuxeqq7hfhfz00g223faxdzsgqwluw3czl4uyd5rt8505zm7c66tepzl97aytt968cwp0uhdlre6zhzz9kvp90d65r060n5h0n9nfsqs8tzc2nku5rtlz06vzze2e5rv2csj8l54jv8j54llan7gk84r9ar2azddr83hutd23yqz6u0wxlcpkrl6lppnca383fzgcwf532qnzsm4h7f5qvs2yv8gw07gtflfexmwhpg35prpfus0v9ajx50dwhnqqqn5k3cvx404ad8r35g97tps7z63rfdw8m6xynerct3t6nrc9l2kt4nc0eg3lw5vf4nxagygauk7qrt4gztxfuxgc5v5a3y6x3r22nzdwhx3p6y6my5w09r77ay3yv7lgxuvjh9zlv3ept5def0yu3z6eqv7ve3pr52xnhs5zrzdnnkagdhd6eljfpwvpqauupn4qqydswnfz0k4ktjng0xacpvp8jqv0rsyqjqfxfyn6fask9v8ax5dsr2a3az927aq5xmdg6p7xdjlen56gvaq07ne6gga2tsn6p9mzz2s72t5qlqpmrj2ntzqqv3psxs9f9k56vrt6qqxga72zzxanzaer04ncd0rnyxp9d5tt7nucf0284ssrdpdasade92u90u48mg6cxsetmf989xkvppv5aw5xecha00eegnz5u2jllyvps90vxf6dmjy6aftt4837up7qsccahs0gaeal3smnweqv29v82e9tss4evw46m3hccltmy2c24fq8dlgah06x4e8apewle5wtqvjrrvq30m8qsdhg2w6zwjktg2m22crru2wkukwy3rvgjmvyhz25y2v2l2ughz8v6w0vujvz8qu99wl0ugy9hgac8h9mz9j0nkt9t9sswa8ejucjvpe2t8v8psa3sg0wqnaxz4qmmqa00a97muulvgc8943nfmae2n5hlajgknuclm9rxvtrnutq7xtvu3pkkpuexdq907gndl3w5hy06puj6k4j4df63csswpwdlrq2dsut769f92v2qenkjwt6smwjxxzytvddz6vq3f7xnd47nsdgcc0qvqqqqqqqqqqphm8uwgdxz4vk0w5zpk646czf7jel0mq58d7kurvzuevwqk9uzzn3z8nd4mdf2hud65246my9j9asqq0q3a5qz6h0nyp9pcj6nfm0jx09k3jkcdtgsrryxpjldmyac9esg3fu33k72hu3n3l9ya7cg55clyqqy04gnxsq467zzf8s33k223jmefvsxxlangscwk29w9fanatgfksvzcr537fq7yvs3cgyq9gcrrw9jtwuk0dkwmqwprgvzplrfaf468x9l3u5l8m7hgmuyu5a987wkkhqqqqm4vu8k"
    }
  }


test("parses simple u64 plaintext from mapping", () => {
  const raw = "1000000u64";
  const parsed = parseValueToJson(raw);

  expect(typeof parsed).toBe("string");
  expect(parsed.endsWith("u64")).toBe(true);
});

test("parses simple u64 plaintext from mapping", () => {
  const raw = "1000000u64";
  const parsed: Plaintext = parseValueToJson(raw);

  expect(typeof parsed).toBe("string");
  if (typeof parsed === "string") {
    expect(parsed.endsWith("u64")).toBe(true);
  }
});