import { RegisterWizard } from "../components/RegisterWizard";

export default function RegisterPage() {
  return (
    <div className="sg-shell pb-24 pt-32">
      <h1 className="sg-headline">Register your agent.</h1>
      <p className="mt-4 max-w-xl text-[#8888aa]">
        The wallet that holds $GUARD signs the policy memo. You can register that wallet, or watch a
        different trading wallet.
      </p>
      <div className="mt-10">
        <RegisterWizard />
      </div>
    </div>
  );
}
